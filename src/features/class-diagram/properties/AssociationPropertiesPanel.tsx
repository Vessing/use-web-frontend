import { useEffect, useMemo, useState } from 'react';
import { ApiClientError, modelCommandApi } from '../../../api';
import type {
  DeleteImpactDto,
  ProjectDto,
  UmlAssociationDto,
  UmlAssociationEndDto,
} from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { formatMultiplicity } from '../../diagram-core';
import { parseMultiplicity } from './multiplicity';
import { AssociationClassCreateDialog } from './AssociationClassCreateDialog';

interface Props {
  project: ProjectDto;
  association: UmlAssociationDto;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
}

export function AssociationPropertiesPanel(props: Props) {
  const { project, association, readVersion, onRefreshProject } = props;
  const [draft, setDraft] = useState(association);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [commandDiagnostic, setCommandDiagnostic] = useState<CommandDiagnostic | null>(null);
  const [invalidMultiplicityIds, setInvalidMultiplicityIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [associationClassCreateOpen, setAssociationClassCreateOpen] = useState(false);

  useEffect(() => {
    setDraft(association);
  }, [association]);

  useEffect(() => {
    setNotice(null);
    setCommandDiagnostic(null);
    setInvalidMultiplicityIds(new Set());
  }, [association.id]);

  const errors = validate(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(association);
  const patchEnd = (id: string, patch: Partial<UmlAssociationEndDto>) => {
    setDraft((current) => ({
      ...current,
      ends: current.ends.map((end) => (end.id === id ? { ...end, ...patch } : end)),
    }));
    setNotice(null);
    setCommandDiagnostic(null);
  };

  const save = async () => {
    if (!dirty || errors.length || invalidMultiplicityIds.size || !readVersion) return;
    setIsSaving(true);
    setNotice(null);
    setCommandDiagnostic(null);
    try {
      const result = await modelCommandApi.updateAssociation(
        project.project.id,
        association.id,
        {
          expectedRevision: readVersion,
          draft,
        },
      );
      if (!await onRefreshProject()) {
        throw new Error('The authoritative association projection could not be reloaded.');
      }
      setNotice({ error: false, text: `Association "${result.result.name}" saved at model revision ${result.revision}.` });
      appStoreActions.markValidationStale();
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `Association "${result.result.name}" saved at model revision ${result.revision}.`,
      });
    } catch (error) {
      setNotice({ error: true, text: errorMessage(error) });
      setCommandDiagnostic(toCommandDiagnostic(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="properties-content association-properties" aria-busy={isSaving} aria-invalid={Boolean(commandDiagnostic?.associationError) || undefined}>
      <header className="association-properties-header">
        <div><span className="properties-eyebrow">Association Properties</span><h3>{association.name}</h3></div>
        <button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Delete</button>
      </header>
      <label className="property-field">
        <span>Association Name</span>
        <input
          value={draft.name}
          aria-invalid={!draft.name.trim() || undefined}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        {!draft.name.trim() ? <small className="property-field-error">Association name is required.</small> : null}
      </label>
      <section className="association-kind-section">
        <div className="association-kind-summary">
          <span>Relationship Kind</span>
          <strong>{relationshipKind(draft)}</strong>
        </div>
        <label className="property-field">
          <span>Association Class</span>
          <select
            value={draft.associationClassId ?? ''}
            aria-invalid={Boolean(commandDiagnostic?.fieldErrors.associationClassId) || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, associationClassId: event.target.value || null }))}
          >
            <option value="">None</option>
            {project.umlModel.classes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.qualifiedName ?? candidate.name}</option>)}
          </select>
          {commandDiagnostic?.fieldErrors.associationClassId ? <small className="property-field-error" role="alert">{commandDiagnostic.fieldErrors.associationClassId}</small> : null}
        </label>
        {draft.associationClassId ? <button type="button" onClick={() => appStoreActions.select({ view: 'class-diagram', type: 'class', id: draft.associationClassId! })}>Open Association Class</button> : <button type="button" className="primary-button" onClick={() => setAssociationClassCreateOpen(true)}>Create Association Class</button>}
      </section>
      <div className="association-end-list">
        {draft.ends.length ? draft.ends.map((end, index) => (
          <EndEditor
            key={end.id}
            end={end}
            index={index}
            project={project}
            diagnostic={commandDiagnostic}
            onChange={(patch) => patchEnd(end.id, patch)}
            onMultiplicityValidityChange={(invalid) => setInvalidMultiplicityIds((current) => {
              const next = new Set(current);
              if (invalid) next.add(end.id); else next.delete(end.id);
              return next;
            })}
            onRemove={draft.ends.length > 2 ? () => {
              if (window.confirm(`Remove end "${end.roleName}"? Existing links and OCL navigation may block this change.`)) {
                setDraft((current) => ({ ...current, ends: current.ends.filter((item) => item.id !== end.id) }));
              }
            } : undefined}
          />
        )) : <p className="properties-empty">This association has no ends.</p>}
      </div>
      <button type="button" className="association-add-end" onClick={() => setDraft((current) => ({ ...current, ends: [...current.ends, newEnd(project)] }))}>Add Association End</button>
      {errors.length ? <div className="properties-message properties-message-error" role="alert">{errors.join(' ')}</div> : null}
      {invalidMultiplicityIds.size ? <div className="properties-message properties-message-error" role="alert">Every multiplicity must use UML notation such as 1, 0..1 or 0..*.</div> : null}
      {notice ? <div className={`properties-message properties-message-${notice.error ? 'error' : 'success'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</div> : null}
      <footer className="properties-actions">
        <button type="button" disabled={!dirty || isSaving} onClick={() => { setDraft(association); setNotice(null); setCommandDiagnostic(null); setInvalidMultiplicityIds(new Set()); }}>Discard</button>
        <button type="button" className="primary-button" disabled={!dirty || isSaving || Boolean(errors.length) || Boolean(invalidMultiplicityIds.size) || !readVersion} onClick={() => void save()}>{isSaving ? 'Applying...' : 'Apply Changes'}</button>
      </footer>
      {deleteOpen ? (
        <DeleteDialog
          project={project}
          association={association}
          fallbackRevision={readVersion}
          onCancel={() => setDeleteOpen(false)}
          onDeleted={async () => {
            setDeleteOpen(false);
            appStoreActions.select(null);
            await onRefreshProject();
          }}
        />
      ) : null}
      {associationClassCreateOpen ? <AssociationClassCreateDialog project={project} associationId={association.id} associationName={association.name} expectedRevision={readVersion} onCancel={() => setAssociationClassCreateOpen(false)} onRefreshProject={onRefreshProject} /> : null}
    </div>
  );
}

function EndEditor({ end, index, project, diagnostic, onChange, onMultiplicityValidityChange, onRemove }: {
  end: UmlAssociationEndDto;
  index: number;
  project: ProjectDto;
  diagnostic: CommandDiagnostic | null;
  onChange: (patch: Partial<UmlAssociationEndDto>) => void;
  onMultiplicityValidityChange: (invalid: boolean) => void;
  onRemove?: () => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const multiplicity = formatMultiplicity(end.multiplicity);
  const candidates = useMemo(() => project.umlModel.associations
    .flatMap((association) => association.ends.map((candidate) => ({
      id: candidate.id,
      label: `${association.name} / ${candidate.roleName || classifierName(project, candidate.classId)}`,
    })))
    .filter((candidate) => candidate.id !== end.id), [end.id, project]);
  const summary = `${end.roleName || 'Unnamed role'} [${multiplicity}]`;
  const endError = diagnostic?.endErrors[end.id];

  return (
    <section className="association-end-card" aria-invalid={Boolean(endError) || undefined}>
      <button
        type="button"
        className="association-end-toggle"
        aria-expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
      >
        <span aria-hidden="true">{advanced ? 'v' : '>'}</span>
        <strong>End {index + 1}: {classifierName(project, end.classId)}</strong>
        <span>{summary}</span>
      </button>
      <div className="association-end-grid">
        <label className="property-field"><span>Classifier</span><select value={end.classId} onChange={(event) => onChange({ classId: event.target.value })}>{project.umlModel.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <TextField label="Role Name" value={end.roleName} invalid={!end.roleName.trim()} onChange={(roleName) => onChange({ roleName })} />
        <MultiplicityField value={multiplicity} serverError={diagnostic?.fieldErrors[`ends.${end.id}.multiplicity`]} onValidityChange={onMultiplicityValidityChange} onChange={(value) => onChange({ multiplicity: value })} />
        <label className="property-field"><span>Aggregation</span><select value={end.aggregationKind ?? 'NONE'} onChange={(event) => onChange({ aggregationKind: event.target.value as NonNullable<UmlAssociationEndDto['aggregationKind']> })}><option value="NONE">None</option><option value="SHARED">Shared aggregation</option><option value="COMPOSITE">Composition</option></select></label>
      </div>
      <div className="association-boolean-grid">
        <Check label="Navigable" checked={end.navigable ?? false} onChange={(navigable) => onChange({ navigable })} />
        <Check label="Ordered" checked={end.ordered ?? false} onChange={(ordered) => onChange({ ordered })} />
        <Check label="Unique" checked={end.unique ?? true} onChange={(unique) => onChange({ unique })} />
      </div>
      <div className="association-navigation-result"><span>Navigation result</span><strong>{end.navigationType || 'Provided after backend validation'}</strong></div>
      {advanced ? (
        <div className="association-advanced">
          <div className="association-boolean-grid">
            <Check label="Derived" checked={end.derived ?? false} onChange={(derived) => onChange({ derived, ...(!derived ? { union: false } : {}) })} />
            <Check label="Union" checked={end.union ?? false} disabled={!end.derived} onChange={(union) => onChange({ union })} />
          </div>
          <References label="Subsets ends" candidates={candidates} selected={end.subsettedEndIds ?? []} onChange={(subsettedEndIds) => onChange({ subsettedEndIds })} />
          <References label="Redefines ends" candidates={candidates} selected={end.redefinedEndIds ?? []} onChange={(redefinedEndIds) => onChange({ redefinedEndIds })} />
          <QualifierEditor qualifiers={end.qualifiers ?? []} diagnostic={diagnostic} onChange={(qualifiers) => onChange({ qualifiers })} />
          {endError ? <p className="property-field-error" role="alert">{endError}</p> : null}
          {onRemove ? <button type="button" className="danger-button" onClick={onRemove}>Remove End</button> : <p className="association-minimum-hint">An association requires at least two ends.</p>}
        </div>
      ) : null}
    </section>
  );
}

function TextField({ label, value, invalid, onChange }: { label: string; value: string; invalid: boolean; onChange: (value: string) => void }) { return <label className="property-field"><span>{label}</span><input value={value} aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value)} /></label>; }
function MultiplicityField({ value, serverError, onChange, onValidityChange }: { value: string; serverError?: string; onChange: (value: UmlAssociationEndDto['multiplicity']) => void; onValidityChange: (invalid: boolean) => void }) {
  const [raw, setRaw] = useState(value);
  useEffect(() => { setRaw(value); }, [value]);
  const invalid = !parseMultiplicity(raw);
  return <label className="property-field"><span>Multiplicity</span><input value={raw} aria-invalid={invalid || Boolean(serverError) || undefined} onChange={(event) => { const next = event.target.value; const parsed = parseMultiplicity(next); setRaw(next); onValidityChange(!parsed); if (parsed) onChange(parsed); }} />{serverError ? <small className="property-field-error">{serverError}</small> : null}</label>;
}
function Check({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) { return <label className="association-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }
function References({ label, candidates, selected, onChange }: { label: string; candidates: Array<{ id: string; label: string }>; selected: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className="association-reference-select"><legend>{label}</legend>{candidates.length ? candidates.map((candidate) => <label key={candidate.id}><input type="checkbox" checked={selected.includes(candidate.id)} onChange={(event) => onChange(event.target.checked ? [...selected, candidate.id] : selected.filter((id) => id !== candidate.id))} /> {candidate.label}</label>) : <p>No candidate ends available.</p>}</fieldset>;
}

function QualifierEditor({ qualifiers, diagnostic, onChange }: { qualifiers: NonNullable<UmlAssociationEndDto['qualifiers']>; diagnostic: CommandDiagnostic | null; onChange: (qualifiers: NonNullable<UmlAssociationEndDto['qualifiers']>) => void }) {
  const update = (id: string, patch: Partial<NonNullable<UmlAssociationEndDto['qualifiers']>[number]>) => onChange(qualifiers.map((qualifier) => qualifier.id === id ? { ...qualifier, ...patch } : qualifier));
  return <fieldset className="association-reference-select qualifier-editor"><legend>Qualifiers</legend>{qualifiers.length ? qualifiers.map((qualifier, index) => { const qualifierError = diagnostic?.qualifierErrors[qualifier.id]; return <div className="qualifier-row" key={qualifier.id} aria-invalid={Boolean(qualifierError) || undefined}><input aria-label={`Qualifier ${index + 1} name`} value={qualifier.name} aria-invalid={Boolean(qualifierError) || undefined} onChange={(event) => update(qualifier.id, { name: event.target.value })} /><select aria-label={`Qualifier ${index + 1} type`} value={qualifier.type} aria-invalid={Boolean(qualifierError) || undefined} onChange={(event) => update(qualifier.id, { type: event.target.value })}><option>String</option><option>Integer</option><option>Real</option><option>Boolean</option></select><button type="button" aria-label={`Move qualifier ${qualifier.name} up`} disabled={index === 0} onClick={() => onChange(moveQualifier(qualifiers, index, -1))}>Up</button><button type="button" aria-label={`Remove qualifier ${qualifier.name}`} onClick={() => onChange(qualifiers.filter((item) => item.id !== qualifier.id).map((item, order) => ({ ...item, order })))}>Remove</button>{qualifierError ? <small className="property-field-error" role="alert">{qualifierError}</small> : null}</div>; }) : <p>No qualifiers defined for this end.</p>}<button type="button" onClick={() => onChange([...qualifiers, { id: `qualifier-${crypto.randomUUID()}`, name: '', type: 'String', order: qualifiers.length }])}>Add Qualifier</button></fieldset>;
}

function moveQualifier(qualifiers: NonNullable<UmlAssociationEndDto['qualifiers']>, index: number, delta: number) { const next = [...qualifiers]; const target = index + delta; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, order) => ({ ...item, order })); }

function DeleteDialog({ project, association, fallbackRevision, onCancel, onDeleted }: { project: ProjectDto; association: UmlAssociationDto; fallbackRevision: string; onCancel: () => void; onDeleted: () => Promise<void> }) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    void modelCommandApi.getDeleteImpact(project.project.id, 'ASSOCIATION', association.id)
      .then((result) => { if (active) setImpact(result); })
      .catch((caught) => { if (active) setError(errorMessage(caught)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [association.id, project.project.id]);
  const blockers = impact?.references.filter((reference) => !reference.cascadeAllowed) ?? [];
  const canDelete = Boolean(impact) && blockers.length === 0 && !busy;
  const remove = async () => {
    if (!impact || !canDelete) return;
    setBusy(true); setError(null);
    try {
      await modelCommandApi.deleteElement(project.project.id, 'ASSOCIATION', association.id, {
        expectedRevision: impact.revision || fallbackRevision,
        cascadeReferenceIds: selected,
      });
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Association "${association.name}" deleted.` });
      await onDeleted();
    } catch (caught) { setError(errorMessage(caught)); setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation"><div className="modal-dialog association-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-association-title"><header className="modal-header"><h2 id="delete-association-title">Delete Association</h2><button type="button" className="icon-button" onClick={onCancel}>Close</button></header><div className="modal-body"><p>Are you sure you want to delete <strong>{association.name}</strong>?</p>{busy && !impact ? <p className="modal-empty">Checking references...</p> : null}{impact?.references.length === 0 ? <p className="properties-message properties-message-success">No dependent references were found.</p> : null}{impact?.references.map((reference) => <label key={reference.referenceId} className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}><input type="checkbox" disabled={!reference.cascadeAllowed} checked={selected.includes(reference.referenceId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} /><span><strong>{reference.elementName}</strong><small>{reference.relation}{reference.cascadeAllowed ? ' / may be deleted with this association' : ' / blocks deletion'}</small></span></label>)}{error ? <p className="modal-form-error" role="alert">{error}</p> : null}</div><footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void remove()}>{busy ? 'Deleting...' : 'Delete Association'}</button></footer></div></div>;
}

function validate(draft: UmlAssociationDto) { const errors: string[] = []; if (!draft.name.trim()) errors.push('Association name is required.'); if (draft.ends.length < 2) errors.push('An association requires at least two ends.'); draft.ends.forEach((end, index) => { if (!end.roleName.trim()) errors.push(`End ${index + 1} requires a role name.`); const names=(end.qualifiers ?? []).map((item) => item.name.trim()); if (names.some((name) => !name)) errors.push(`End ${index + 1} contains an unnamed qualifier.`); if (new Set(names).size !== names.length) errors.push(`End ${index + 1} contains duplicate qualifier names.`); }); return errors; }
function classifierName(project: ProjectDto, id: string) { return project.umlModel.classes.find((item) => item.id === id)?.name ?? id; }
function relationshipKind(association: UmlAssociationDto) {
  if (association.associationClassId) return 'Association Class';
  if (association.ends.some((end) => end.aggregationKind === 'COMPOSITE')) return 'Composition';
  if (association.ends.some((end) => end.aggregationKind === 'SHARED')) return 'Shared Aggregation';
  return association.ends.length > 2 ? 'N-ary Association' : 'Association';
}
function errorMessage(error: unknown) { if (error instanceof ApiClientError) { const fields = error.dto.fieldErrors ? ` ${Object.values(error.dto.fieldErrors).join(' ')}` : ''; return `${error.dto.userMessage ?? error.message} (${error.dto.code})${fields}`; } return error instanceof Error ? error.message : 'The command could not be applied.'; }
interface CommandDiagnostic { associationError?: string; fieldErrors: Record<string, string>; endErrors: Record<string, string>; qualifierErrors: Record<string, string>; }
function toCommandDiagnostic(error: unknown): CommandDiagnostic | null {
  if (!(error instanceof ApiClientError)) return null;
  const message = `${error.dto.userMessage ?? error.message} (${error.dto.code})`;
  const details = error.dto.details ?? {};
  const fieldErrors = { ...(error.dto.fieldErrors ?? {}), ...(isStringRecord(details.fieldErrors) ? details.fieldErrors : {}) };
  const endErrors: Record<string, string> = {};
  const qualifierErrors: Record<string, string> = {};
  let associationError: string | undefined;
  if (typeof details.associationEndId === 'string') endErrors[details.associationEndId] = message;
  if (typeof details.qualifierId === 'string') qualifierErrors[details.qualifierId] = message;
  if (Array.isArray(details.targets)) details.targets.forEach((target) => {
    if (!isRecord(target) || typeof target.elementId !== 'string') return;
    if (target.elementType === 'ASSOCIATION') associationError = message;
    if (target.elementType === 'ASSOCIATION_END') endErrors[target.elementId] = message;
    if (target.elementType === 'QUALIFIER') qualifierErrors[target.elementId] = message;
    if (typeof target.path === 'string') fieldErrors[target.path] = message;
  });
  return { associationError, fieldErrors, endErrors, qualifierErrors };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isStringRecord(value: unknown): value is Record<string, string> { return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string'); }
function newEnd(project: ProjectDto): UmlAssociationEndDto { return { id: `association-end-${crypto.randomUUID()}`, classId: project.umlModel.classes[0]?.id ?? '', roleName: '', multiplicity: { lower: 0, upper: null, unbounded: true, raw: '0..*' }, navigable: true, ordered: false, unique: true, derived: false, union: false, subsettedEndIds: [], redefinedEndIds: [], navigationType: null, qualifiers: [], aggregationKind: 'NONE' }; }
