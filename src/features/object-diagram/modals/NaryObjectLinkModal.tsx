import { useMemo, useState, type FormEvent } from 'react';
import { ApiClientError, snapshotCommandApi } from '../../../api';
import type { AssociationClassInstanceDraftDto, ObjectLinkDto, ObjectLinkEndValueDto, ProjectDto, QualifierValueDto, UmlAssociationDto, UmlAttributeDto } from '../../../api/dtos';
import { appStoreActions, type ModalState } from '../../../state';

interface Props {
  modal: Extract<Exclude<ModalState, null>, { type: 'addObjectAssociation' }>;
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}

interface AssignmentDraft { objectId: string; qualifierValues: Record<string, string>; }

export function NaryObjectLinkModal({ modal, project, expectedRevision, onRefreshProject }: Props) {
  const associations = project.umlModel.associations;
  const [associationId, setAssociationId] = useState(modal.associationId ?? associations[0]?.id ?? '');
  const association = associations.find((item) => item.id === associationId);
  const associationClass = project.umlModel.classes.find((item) => item.id === association?.associationClassId);
  const [linkId] = useState(() => `object-link-${crypto.randomUUID()}`);
  const [associationClassObjectId] = useState(() => `object-${crypto.randomUUID()}`);
  const [instanceName, setInstanceName] = useState('');
  const [ownedValues, setOwnedValues] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Record<string, AssignmentDraft>>(() => initialAssignments(project, association, modal.sourceObjectId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<LinkCommandDiagnostic | null>(null);
  const fieldErrors = validate(association, assignments);

  const chooseAssociation = (id: string) => {
    const next = associations.find((item) => item.id === id);
    setAssociationId(id);
    setAssignments(initialAssignments(project, next));
    setInstanceName('');
    setOwnedValues({});
    setError(null);
    setDiagnostic(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!association || fieldErrors.length || !expectedRevision || (associationClass && !instanceName.trim())) return;
    setBusy(true);
    setError(null);
    setDiagnostic(null);
    const draft: ObjectLinkDto = {
      id: linkId,
      associationId,
      endValues: association.ends.map((end): ObjectLinkEndValueDto => ({
        associationEndId: end.id,
        objectId: assignments[end.id].objectId,
        qualifierValues: (end.qualifiers ?? []).map((qualifier): QualifierValueDto => ({
          qualifierId: qualifier.id,
          value: typedValue(qualifier.type, assignments[end.id].qualifierValues[qualifier.id]),
        })),
      })),
    };

    try {
      const aggregateResult = associationClass ? await snapshotCommandApi.createAssociationClassInstance(project.project.id, {
        expectedRevision,
        draft: associationClassDraft(draft, associationClassObjectId, instanceName, associationClass.id, associationClass.attributes, ownedValues),
      }) : null;
      const linkResult = associationClass ? null : await snapshotCommandApi.createObjectLink(project.project.id, { expectedRevision, draft });
      if (!await onRefreshProject()) throw new Error('The authoritative object-link projection could not be reloaded.');
      appStoreActions.markValidationStale();
      const savedLink = aggregateResult?.result.link ?? linkResult?.result;
      if (!savedLink) throw new Error('The saved object-link projection is missing.');
      appStoreActions.select({ view: 'object-diagram', type: 'objectLink', id: savedLink.id });
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Object link for "${association.name}" saved at snapshot revision ${aggregateResult?.revision ?? linkResult?.revision}.` });
      appStoreActions.closeModal();
    } catch (caught) {
      setError(message(caught));
      setDiagnostic(toLinkCommandDiagnostic(caught));
    } finally {
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" role="presentation"><form className="modal-dialog nary-link-dialog" role="dialog" aria-modal="true" aria-labelledby="nary-link-title" onSubmit={submit}>
    <header className="modal-header"><h2 id="nary-link-title">Create Object Link</h2><button type="button" className="icon-button" onClick={appStoreActions.closeModal}>Close</button></header>
    <div className="modal-body">
      <label className="modal-field"><span>Association</span><select value={associationId} aria-invalid={Boolean(diagnostic?.associationError) || undefined} onChange={(event) => chooseAssociation(event.target.value)}>{associations.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.ends.length} ends)</option>)}</select>{diagnostic?.associationError ? <small className="property-field-error">{diagnostic.associationError}</small> : null}</label>
      {association ? <div className="nary-end-list">{association.ends.map((end, index) => <EndAssignment key={end.id} project={project} endIndex={index} end={end} value={assignments[end.id] ?? { objectId: '', qualifierValues: {} }} diagnostic={diagnostic} onChange={(value) => { setAssignments((current) => ({ ...current, [end.id]: value })); setError(null); setDiagnostic(null); }} />)}</div> : <p className="modal-empty">No Association is available.</p>}
      {associationClass ? <section className="modal-section association-class-instance-draft"><div className="modal-section-header"><div><h3>Association-Class Instance</h3><p>Created atomically with this Object Link as one shared identity.</p></div></div><label className="modal-field"><span>Link and Object Name</span><input value={instanceName} aria-invalid={Boolean(diagnostic?.objectError) || undefined} onChange={(event) => { setInstanceName(event.target.value); setError(null); setDiagnostic(null); }} />{diagnostic?.objectError ? <small className="property-field-error">{diagnostic.objectError}</small> : null}</label><div className="association-class-owned-value-grid">{editableAttributes(associationClass.attributes).length ? editableAttributes(associationClass.attributes).map((attribute) => <OwnedValueField key={attribute.id} attribute={attribute} value={ownedValues[attribute.id] ?? ''} error={diagnostic?.slotErrors[attribute.id]} onChange={(value) => { setOwnedValues((current) => ({ ...current, [attribute.id]: value })); setError(null); setDiagnostic(null); }} />) : <p className="modal-empty">This Association Class has no editable owned attributes.</p>}</div></section> : null}
      {association && association.ends.length > 2 ? <p className="modal-hint">All end assignments form one n-ary object link.</p> : null}
      {!expectedRevision ? <p className="modal-form-error">The snapshot revision is not available.</p> : null}
      {fieldErrors.length ? <p className="modal-form-error" role="alert">{fieldErrors.join(' ')}</p> : null}
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
    </div>
    <footer className="modal-footer"><button type="button" onClick={appStoreActions.closeModal}>Cancel</button><button type="submit" className="primary-button" disabled={busy || !association || Boolean(fieldErrors.length) || !expectedRevision || Boolean(associationClass && !instanceName.trim())}>{busy ? 'Creating...' : 'Create Object Link'}</button></footer>
  </form></div>;
}

function EndAssignment({ project, end, endIndex, value, diagnostic, onChange }: { project: ProjectDto; end: UmlAssociationDto['ends'][number]; endIndex: number; value: AssignmentDraft; diagnostic: LinkCommandDiagnostic | null; onChange: (value: AssignmentDraft) => void; }) {
  const classifier = project.umlModel.classes.find((item) => item.id === end.classId);
  const objects = useMemo(() => project.objectModel.objects.filter((item) => item.classId === end.classId), [end.classId, project.objectModel.objects]);
  const endError = diagnostic?.endErrors[end.id];
  return <section className="modal-section nary-end-draft" aria-invalid={Boolean(endError) || undefined}>
    <div className="modal-section-header"><h3>{end.roleName || `End ${endIndex + 1}`} / {classifier?.name ?? end.classId}</h3></div>
    <label className="modal-field"><span>Object</span><select value={value.objectId} aria-invalid={Boolean(endError) || undefined} onChange={(event) => onChange({ ...value, objectId: event.target.value })}><option value="">Select {classifier?.name ?? 'object'}</option>{objects.map((object) => <option key={object.id} value={object.id}>{object.displayName ?? object.name}</option>)}</select>{endError ? <small className="property-field-error">{endError}</small> : null}</label>
    {(end.qualifiers ?? []).map((qualifier) => { const qualifierError = diagnostic?.qualifierErrors[qualifier.id]; return <label className="modal-field" key={qualifier.id}><span>{qualifier.name} / {qualifier.type}</span><input value={value.qualifierValues[qualifier.id] ?? ''} aria-invalid={Boolean(qualifierError) || undefined} onChange={(event) => onChange({ ...value, qualifierValues: { ...value.qualifierValues, [qualifier.id]: event.target.value } })} />{qualifierError ? <small className="property-field-error">{qualifierError}</small> : null}</label>; })}
  </section>;
}

function initialAssignments(project: ProjectDto, association?: UmlAssociationDto, preferredObjectId?: string) {
  return Object.fromEntries((association?.ends ?? []).map((end, index) => [end.id, {
    objectId: index === 0 && preferredObjectId && project.objectModel.objects.some((item) => item.id === preferredObjectId && item.classId === end.classId) ? preferredObjectId : project.objectModel.objects.find((item) => item.classId === end.classId)?.id ?? '',
    qualifierValues: Object.fromEntries((end.qualifiers ?? []).map((qualifier) => [qualifier.id, ''])),
  }]));
}

function validate(association: UmlAssociationDto | undefined, assignments: Record<string, AssignmentDraft>) {
  if (!association) return [];
  const errors: string[] = [];
  association.ends.forEach((end, index) => {
    const value = assignments[end.id];
    if (!value?.objectId) errors.push(`${end.roleName || `End ${index + 1}`} requires an object.`);
    (end.qualifiers ?? []).forEach((qualifier) => { if (!value?.qualifierValues[qualifier.id]?.trim()) errors.push(`Qualifier ${qualifier.name} is required.`); });
  });
  return errors;
}

function typedValue(type: string, raw: string) { if (type === 'Integer') return { type, value: Number.parseInt(raw, 10) }; if (type === 'Real') return { type, value: Number.parseFloat(raw) }; if (type === 'Boolean') return { type, value: raw === 'true' }; return { type, value: raw }; }

interface LinkCommandDiagnostic { associationError?: string; objectError?: string; endErrors: Record<string, string>; qualifierErrors: Record<string, string>; slotErrors: Record<string, string>; }

function toLinkCommandDiagnostic(error: unknown): LinkCommandDiagnostic | null {
  if (!(error instanceof ApiClientError)) return null;
  const text = message(error);
  const details = error.dto.details ?? {};
  const endErrors: Record<string, string> = {};
  const qualifierErrors: Record<string, string> = {};
  const slotErrors: Record<string, string> = {};
  let associationError: string | undefined;
  let objectError: string | undefined;
  if (typeof details.associationEndId === 'string') endErrors[details.associationEndId] = text;
  if (typeof details.qualifierId === 'string') qualifierErrors[details.qualifierId] = text;
  if (Array.isArray(details.targets)) details.targets.forEach((target) => { if (!isRecord(target) || typeof target.elementId !== 'string') return; if (target.elementType === 'ASSOCIATION') associationError = text; if (target.elementType === 'ASSOCIATION_END') endErrors[target.elementId] = text; if (target.elementType === 'QUALIFIER') qualifierErrors[target.elementId] = text; if (target.elementType === 'OBJECT' || target.elementType === 'OBJECT_LINK') objectError = text; if (target.elementType === 'SLOT' || target.elementType === 'ATTRIBUTE') slotErrors[target.elementId] = text; });
  return { associationError, objectError, endErrors, qualifierErrors, slotErrors };
}

function message(error: unknown) { return error instanceof ApiClientError ? `${error.dto.userMessage ?? error.message} (${error.dto.code})` : error instanceof Error ? error.message : 'Object link could not be saved.'; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

function editableAttributes(attributes: UmlAttributeDto[]) { return attributes.filter((attribute) => !attribute.derived && !attribute.staticAttribute); }
function OwnedValueField({ attribute, value, error, onChange }: { attribute: UmlAttributeDto; value: string; error?: string; onChange: (value: string) => void }) { return <label className="modal-field"><span>{attribute.name} / {attribute.type}</span>{attribute.type === 'Boolean' ? <select value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)}><option value="">Unset</option><option value="true">true</option><option value="false">false</option></select> : <input value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)} />}{error ? <small className="property-field-error">{error}</small> : null}</label>; }
function associationClassDraft(link: ObjectLinkDto, objectId: string, name: string, classId: string, attributes: UmlAttributeDto[], values: Record<string, string>): AssociationClassInstanceDraftDto { return { link: { ...link, name: name.trim(), associationClassObjectId: objectId }, associationClassObject: { id: objectId, name: name.trim(), classId, slots: editableAttributes(attributes).map((attribute) => { const raw = values[attribute.id] ?? ''; return { id: `slot-${attribute.id}-${objectId}`, attributeId: attribute.id, value: typedValue(attribute.type, raw), isUnset: raw === '' }; }) } }; }
