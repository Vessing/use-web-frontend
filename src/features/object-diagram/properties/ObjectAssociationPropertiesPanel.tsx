import { useEffect, useState } from 'react';
import { ApiClientError, snapshotCommandApi } from '../../../api';
import { navigateTo } from '../../../app/browserRouter';
import { getWorkspacePath } from '../../../app/navigation';
import type { AssociationClassObjectDraftDto, ObjectInstanceDto, ObjectLinkDeleteImpactDto, ObjectLinkDto, ProjectDto, QualifierValueDto, UmlAttributeDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';

interface Props {
  project: ProjectDto;
  link: ObjectLinkDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}

export function ObjectAssociationPropertiesPanel({ project, link, expectedRevision, onRefreshProject }: Props) {
  const association = project.umlModel.associations.find((candidate) => candidate.id === link.associationId);
  const associationClassObject = project.objectModel.objects.find((candidate) => candidate.id === link.associationClassObjectId);
  const associationClass = project.umlModel.classes.find((candidate) => candidate.id === association?.associationClassId);
  const [draft, setDraft] = useState(link);
  const [objectDraft, setObjectDraft] = useState<ObjectInstanceDto | null>(associationClassObject ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [diagnostic, setDiagnostic] = useState<LinkDiagnostic | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'ownedValues'>('assignments');

  useEffect(() => { setDraft(link); setObjectDraft(associationClassObject ?? null); }, [associationClassObject, link]);
  useEffect(() => { setNotice(null); setDiagnostic(null); setDeleteOpen(false); }, [link.id]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(link) || JSON.stringify(objectDraft) !== JSON.stringify(associationClassObject ?? null);
  const complete = association ? association.ends.every((end) => {
    const value = draft.endValues.find((item) => item.associationEndId === end.id);
    return Boolean(value?.objectId) && (end.qualifiers ?? []).every((qualifier) =>
      value?.qualifierValues?.some((candidate) => candidate.qualifierId === qualifier.id),
    );
  }) : false;

  const save = async () => {
    if (!dirty || !complete || !expectedRevision) return;
    setBusy(true); setNotice(null); setDiagnostic(null);
    try {
      const result = associationClassObject && objectDraft
        ? await snapshotCommandApi.updateAssociationClassInstance(project.project.id, link.id, {
          expectedRevision,
          draft: { link: { ...draft, associationClassObjectId: objectDraft.id }, associationClassObject: toAssociationClassObjectDraft(objectDraft, associationClass?.attributes ?? []) },
        })
        : await snapshotCommandApi.updateObjectLink(project.project.id, link.id, { expectedRevision, draft });
      if (!await onRefreshProject()) throw new Error('The authoritative object-link projection could not be reloaded.');
      const text = `Object link "${displayName(link, association?.name)}" saved at snapshot revision ${result.revision}.`;
      setNotice({ error: false, text });
      appStoreActions.markValidationStale();
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: text });
    } catch (caught) {
      setNotice({ error: true, text: errorMessage(caught) });
      setDiagnostic(toDiagnostic(caught, draft));
    } finally { setBusy(false); }
  };

  return <div className="properties-content object-link-properties" aria-busy={busy} aria-invalid={Boolean(diagnostic?.linkError) || undefined}>
    <header className="object-link-properties-header"><div><span className="properties-eyebrow">Object Link</span><h3>{displayName(link, association?.name)}</h3></div><button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Delete Link</button></header>
    {!association ? <p className="properties-message properties-message-error">The referenced Association could not be resolved.</p> : <>
      <section className="object-link-association-summary"><span>Association</span><strong>{association.name}</strong><button type="button" onClick={() => { appStoreActions.select({ view: 'class-diagram', type: 'association', id: association.id }); navigateTo(getWorkspacePath(project.project.id, 'class-diagram')); }}>Open in Class Diagram</button></section>
      {associationClassObject ? <section className="association-class-identity-summary"><span className="properties-eyebrow">Shared Association-Class identity</span><strong>{associationClassObject.displayName ?? associationClassObject.name} : {associationClass?.name ?? associationClassObject.classId}</strong><p>The Object Link and this Object are one backend-managed identity.</p><div className="properties-segmented-control properties-segmented-control-compact" role="tablist" aria-label="Association Class instance"><button type="button" role="tab" aria-selected={activeTab === 'assignments'} className={activeTab === 'assignments' ? 'active' : undefined} onClick={() => setActiveTab('assignments')}>End Assignments</button><button type="button" role="tab" aria-selected={activeTab === 'ownedValues'} className={activeTab === 'ownedValues' ? 'active' : undefined} onClick={() => setActiveTab('ownedValues')}>Owned Values</button></div></section> : null}
      {activeTab === 'ownedValues' && objectDraft ? <section className="association-class-owned-values">{associationClass?.attributes.length ? associationClass.attributes.map((attribute) => { const slot = objectDraft.slots.find((candidate) => candidate.attributeId === attribute.id); const slotError = diagnostic?.slotErrors[attribute.id]; const readOnly = Boolean(attribute.derived || attribute.staticAttribute || attribute.readonly); return <label className="property-field association-class-owned-value" key={attribute.id}><span>{attribute.name} : {attribute.type}{readOnly ? ' (read-only)' : ''}</span>{readOnly ? <strong>{formatOwnedValue(slot?.value, slot?.isUnset)}</strong> : ownedValueControl(attribute, slot?.value, slot?.isUnset, (value, isUnset) => patchOwnedValue(attribute, value, isUnset), Boolean(slotError))}{slotError ? <small className="property-field-error" role="alert">{slotError}</small> : null}</label>; }) : <p className="properties-empty">This Association Class has no owned attributes.</p>}</section> : null}
      {activeTab === 'assignments' ? <div className="object-link-end-list">{association.ends.map((end, index) => {
        const value = draft.endValues.find((item) => item.associationEndId === end.id) ?? { associationEndId: end.id, objectId: '', qualifierValues: [] };
        const classifier = project.umlModel.classes.find((item) => item.id === end.classId);
        const objects = project.objectModel.objects.filter((item) => item.classId === end.classId);
        const endError = diagnostic?.endErrors[end.id];
        return <section className="object-link-end-card" key={end.id} aria-invalid={Boolean(endError) || undefined}>
          <header><div><strong>{end.roleName || `End ${index + 1}`}</strong><span>{classifier?.name ?? end.classId}</span></div><div className="object-link-semantics">{end.ordered ? <span>ordered</span> : null}{end.unique ? <span>unique</span> : null}</div></header>
          <label className="property-field"><span>Assigned Object</span><select value={value.objectId} aria-invalid={Boolean(endError) || undefined} onChange={(event) => patchEnd(end.id, { objectId: event.target.value })}><option value="">Select object</option>{objects.map((object) => <option key={object.id} value={object.id}>{object.displayName ?? object.name}</option>)}</select>{endError ? <small className="property-field-error" role="alert">{endError}</small> : null}</label>
          {(end.qualifiers ?? []).map((qualifier) => {
            const qualifierValue = value.qualifierValues?.find((item) => item.qualifierId === qualifier.id);
            const qualifierError = diagnostic?.qualifierErrors[qualifier.id];
            return <label className="property-field" key={qualifier.id}><span>{qualifier.name} : {qualifier.type}</span><input value={toInputValue(qualifierValue)} aria-invalid={Boolean(qualifierError) || undefined} onChange={(event) => patchQualifier(end.id, qualifier.id, qualifier.type, event.target.value)} />{qualifierError ? <small className="property-field-error" role="alert">{qualifierError}</small> : null}</label>;
          })}
        </section>;
      })}</div> : null}
    </>}
    {!expectedRevision ? <p className="properties-message properties-message-error">The snapshot revision is not available.</p> : null}
    {notice ? <p className={`properties-message properties-message-${notice.error ? 'error' : 'success'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</p> : null}
    <footer className="properties-actions"><button type="button" disabled={!dirty || busy} onClick={() => { setDraft(link); setObjectDraft(associationClassObject ?? null); setNotice(null); setDiagnostic(null); }}>Discard</button><button type="button" className="primary-button" disabled={!dirty || busy || !complete || !expectedRevision} onClick={() => void save()}>{busy ? 'Saving...' : associationClassObject ? 'Save Instance' : 'Save Assignments'}</button></footer>
    {deleteOpen ? <ObjectLinkDeleteDialog project={project} link={link} associationName={association?.name ?? link.associationId} fallbackRevision={expectedRevision} onCancel={() => setDeleteOpen(false)} onDeleted={async () => { setDeleteOpen(false); appStoreActions.select(null); await onRefreshProject(); }} /> : null}
  </div>;

  function patchEnd(endId: string, patch: { objectId: string }) {
    setDraft((current) => ({ ...current, endValues: upsertEnd(current, endId, (value) => ({ ...value, ...patch })) }));
    setNotice(null); setDiagnostic(null);
  }

  function patchQualifier(endId: string, qualifierId: string, type: string, raw: string) {
    setDraft((current) => ({ ...current, endValues: upsertEnd(current, endId, (value) => ({ ...value, qualifierValues: upsertQualifier(value.qualifierValues ?? [], qualifierId, { type, value: parseValue(type, raw) }) })) }));
    setNotice(null); setDiagnostic(null);
  }

  function patchOwnedValue(attribute: UmlAttributeDto, value: string | number | boolean | null, isUnset: boolean) {
    setObjectDraft((current) => current ? {
      ...current,
      slots: upsertSlot(current, attribute, value, isUnset),
    } : current);
    setNotice(null); setDiagnostic(null);
  }
}

function ObjectLinkDeleteDialog({ project, link, associationName, fallbackRevision, onCancel, onDeleted }: { project: ProjectDto; link: ObjectLinkDto; associationName: string; fallbackRevision: string; onCancel: () => void; onDeleted: () => Promise<void>; }) {
  const [impact, setImpact] = useState<ObjectLinkDeleteImpactDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    void snapshotCommandApi.getObjectLinkDeleteImpact(project.project.id, link.id)
      .then((result) => { if (active) { setImpact(result); setSelected([]); } })
      .catch((caught) => { if (active) setError(errorMessage(caught)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [link.id, project.project.id]);

  const allCascadesSelected = impact?.allowedCascades.every((item) => selected.includes(item.referenceId)) ?? false;
  const canDelete = Boolean(impact) && !impact?.blocked && allCascadesSelected && !busy;
  const remove = async () => {
    if (!impact || !canDelete) return;
    setBusy(true); setError(null);
    try {
      await snapshotCommandApi.deleteObjectLink(project.project.id, link.id, { expectedRevision: impact.revision || fallbackRevision, cascadeReferenceIds: selected });
      appStoreActions.markValidationStale();
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Object link "${displayName(link, associationName)}" deleted.` });
      await onDeleted();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiClientError && caught.dto.code === 'STALE_SNAPSHOT_REVISION') {
        try { setImpact(await snapshotCommandApi.getObjectLinkDeleteImpact(project.project.id, link.id)); setSelected([]); } catch { /* retain the command error */ }
      }
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" role="presentation"><div className="modal-dialog object-link-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-object-link-title">
    <header className="modal-header"><div><h2 id="delete-object-link-title">Delete Object Link</h2><p>{displayName(link, associationName)} : {associationName}</p></div><button type="button" className="icon-button" onClick={onCancel}>Close</button></header>
    <div className="modal-body">
      {busy && !impact ? <p className="modal-empty">Checking deletion impact...</p> : null}
      {impact ? <><section className="object-link-delete-context"><strong>End assignments</strong>{impact.currentLink.endValues.map((end) => <span key={end.associationEndId}>{referenceName(impact, end.associationEndId)} = {objectName(project, end.objectId)}</span>)}</section>
        {impact.allowedCascades.map((reference) => <label className="delete-impact-row" key={reference.referenceId}><input type="checkbox" checked={selected.includes(reference.referenceId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} /><span><strong>{reference.elementName}</strong><small>{reference.relation} / must be selected explicitly</small></span></label>)}
        {impact.blockers.map((reference) => <div className="delete-impact-row delete-impact-blocker" key={reference.referenceId}><span aria-hidden="true">!</span><span><strong>{reference.elementName}</strong><small>{reference.relation} / blocks deletion</small></span></div>)}
        {!impact.allowedCascades.length && !impact.blockers.length ? <p className="properties-message properties-message-success">The Association and participating Objects remain unchanged.</p> : null}
      </> : null}
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
    </div>
    <footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void remove()}>{busy ? 'Deleting...' : 'Delete Object Link'}</button></footer>
  </div></div>;
}

function upsertEnd(link: ObjectLinkDto, endId: string, update: (value: ObjectLinkDto['endValues'][number]) => ObjectLinkDto['endValues'][number]) {
  const existing = link.endValues.find((item) => item.associationEndId === endId);
  return existing ? link.endValues.map((item) => item.associationEndId === endId ? update(item) : item) : [...link.endValues, update({ associationEndId: endId, objectId: '', qualifierValues: [] })];
}
function upsertQualifier(values: QualifierValueDto[], qualifierId: string, value: QualifierValueDto['value']) { return values.some((item) => item.qualifierId === qualifierId) ? values.map((item) => item.qualifierId === qualifierId ? { qualifierId, value } : item) : [...values, { qualifierId, value }]; }
function parseValue(type: string, raw: string) { if (type === 'Integer') return Number.parseInt(raw, 10); if (type === 'Real') return Number.parseFloat(raw); if (type === 'Boolean') return raw === 'true'; return raw; }
function toInputValue(value?: QualifierValueDto) { const raw = value?.value.value; return raw === null || raw === undefined ? '' : typeof raw === 'object' ? JSON.stringify(raw) : String(raw); }
function objectName(project: ProjectDto, id: string) { const object = project.objectModel.objects.find((item) => item.id === id); return object?.displayName ?? object?.name ?? id; }
function displayName(link: ObjectLinkDto, associationName?: string) { return link.name || `${associationName ?? 'Object Link'} (${link.endValues.length} ends)`; }
function formatOwnedValue(value: unknown, isUnset?: boolean) { if (isUnset) return '<unset>'; if (value === null) return 'null'; if (value === undefined) return '<unset>'; return typeof value === 'string' ? value : JSON.stringify(value); }
function ownedValueControl(attribute: UmlAttributeDto, value: unknown, isUnset: boolean | undefined, onChange: (value: string | number | boolean | null, isUnset: boolean) => void, invalid: boolean) {
  const current = isUnset ? '' : value === null || value === undefined ? '' : String(value);
  if (attribute.type === 'Boolean') return <select value={current} aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value === '' ? null : event.target.value === 'true', event.target.value === '')}><option value="">&lt;unset&gt;</option><option value="true">true</option><option value="false">false</option></select>;
  return <input type={attribute.type === 'Integer' || attribute.type === 'Real' ? 'number' : 'text'} step={attribute.type === 'Real' ? 'any' : undefined} value={current} aria-invalid={invalid || undefined} onChange={(event) => onChange(parseValue(attribute.type, event.target.value), event.target.value === '')} />;
}
function upsertSlot(object: ObjectInstanceDto, attribute: UmlAttributeDto, value: string | number | boolean | null, isUnset: boolean) {
  const existing = object.slots.find((slot) => slot.attributeId === attribute.id);
  const next = { id: existing?.id ?? `slot-${object.id}-${attribute.id}`, attributeId: attribute.id, value, valueType: attribute.type, isUnset };
  return existing ? object.slots.map((slot) => slot.attributeId === attribute.id ? next : slot) : [...object.slots, next];
}
function toAssociationClassObjectDraft(object: ObjectInstanceDto, attributes: UmlAttributeDto[]): AssociationClassObjectDraftDto {
  return {
    id: object.id,
    name: object.name,
    classId: object.classId,
    slots: object.slots.map((slot) => ({
      id: slot.id,
      attributeId: slot.attributeId,
      value: { type: slot.valueType ?? attributes.find((attribute) => attribute.id === slot.attributeId)?.type ?? 'OclAny', value: slot.isUnset ? null : slot.value },
      isUnset: Boolean(slot.isUnset),
    })),
  };
}
function referenceName(impact: ObjectLinkDeleteImpactDto, endId: string) { return impact.context.find((item) => item.elementId === endId)?.elementName ?? endId; }
function errorMessage(error: unknown) { return error instanceof ApiClientError ? `${error.dto.userMessage ?? error.message} (${error.dto.code})` : error instanceof Error ? error.message : 'The object-link command failed.'; }

interface LinkDiagnostic { linkError?: string; endErrors: Record<string, string>; qualifierErrors: Record<string, string>; slotErrors: Record<string, string>; }
function toDiagnostic(error: unknown, draft: ObjectLinkDto): LinkDiagnostic | null {
  if (!(error instanceof ApiClientError)) return null;
  const message = errorMessage(error);
  const details = error.dto.details ?? {};
  const endErrors: Record<string, string> = {};
  const qualifierErrors: Record<string, string> = {};
  const slotErrors: Record<string, string> = {};
  let linkError: string | undefined;
  if (typeof details.associationEndId === 'string') endErrors[details.associationEndId] = message;
  if (typeof details.qualifierId === 'string') qualifierErrors[details.qualifierId] = message;
  if (Array.isArray(details.targets)) details.targets.forEach((target) => {
    if (!isRecord(target) || typeof target.elementId !== 'string') return;
    if (target.elementType === 'OBJECT_LINK' || target.elementType === 'ASSOCIATION') linkError = message;
    if (target.elementType === 'ASSOCIATION_END') endErrors[target.elementId] = message;
    if (target.elementType === 'QUALIFIER') qualifierErrors[target.elementId] = message;
    if (target.elementType === 'SLOT' || target.elementType === 'ATTRIBUTE') slotErrors[target.elementId] = message;
    if (target.elementType === 'OBJECT') draft.endValues.filter((item) => item.objectId === target.elementId).forEach((item) => { endErrors[item.associationEndId] = message; });
  });
  return { linkError, endErrors, qualifierErrors, slotErrors };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
