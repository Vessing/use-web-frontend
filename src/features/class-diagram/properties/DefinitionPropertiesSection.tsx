import { useEffect, useMemo, useState } from 'react';

import { ApiClientError, modelCommandApi, type CommandElementReferenceDto, type DeleteImpactDto, type OclDefinitionElementDto, type OclDefinitionKindDto, type OclDefinitionOwnerKindDto, type ProjectDto, type UmlParameterDto } from '../../../api';
import { appStoreActions } from '../../../state';

type Mode = { kind: 'existing'; id: string } | { kind: 'create' };

interface Props {
  project: ProjectDto;
  ownerKind: OclDefinitionOwnerKindDto;
  ownerId: string;
  ownerName: string;
  revision: string;
  onRefreshProject: () => Promise<boolean>;
}

export function DefinitionPropertiesSection({ project, ownerKind, ownerId, ownerName, revision, onRefreshProject }: Props) {
  const definitions = useMemo(() => (project.definitions ?? []).filter((item) => item.ownerKind === ownerKind && item.ownerId === ownerId), [ownerId, ownerKind, project.definitions]);
  const [mode, setMode] = useState<Mode>(() => definitions[0] ? { kind: 'existing', id: definitions[0].id } : { kind: 'create' });
  const source = mode.kind === 'existing' ? definitions.find((item) => item.id === mode.id) : undefined;
  const initial = useMemo(() => normalizeDefinition(source ?? newDefinition(ownerKind, ownerId, ownerName)), [ownerId, ownerKind, ownerName, source]);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fieldPath, setFieldPath] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { setDraft(initial); setFieldPath(null); setDeleteOpen(false); }, [initial]);

  const localError = validateDefinition(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const updateKind = (kind: OclDefinitionKindDto) => setDraft((current) => ({ ...current, kind, parameters: kind === 'PROPERTY_DEF' ? [] : current.parameters }));
  const updateParameter = (id: string, patch: Partial<UmlParameterDto>) => setDraft((current) => ({ ...current, parameters: current.parameters.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const moveParameter = (id: string, offset: number) => setDraft((current) => {
    const ordered = [...current.parameters].sort(byPosition);
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ordered.length) return current;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    return { ...current, parameters: ordered.map((item, position) => ({ ...item, position })) };
  });

  const save = async () => {
    if (localError || !revision || busy) return;
    setBusy(true); setMessage(null); setFieldPath(null);
    const qualifiedName = `${ownerName}::${draft.name}`;
    const completeDraft = { ...normalizeDefinition(draft), ownerKind, ownerId, ownerName, qualifiedName };
    try {
      const request = { expectedRevision: revision, draft: completeDraft };
      const result = mode.kind === 'create'
        ? await modelCommandApi.createDefinition(project.project.id, request)
        : await modelCommandApi.updateDefinition(project.project.id, mode.id, request);
      if (!await onRefreshProject()) throw new Error('The authoritative definition projection could not be reloaded.');
      if (mode.kind === 'create') setMode({ kind: 'existing', id: result.result.id });
      setMessage({ kind: 'success', text: `Definition saved at model revision ${result.revision}.` });
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Definition ${result.result.qualifiedName} saved at model revision ${result.revision}.` });
    } catch (error) {
      const detail = definitionError(error);
      setMessage({ kind: 'error', text: detail.message });
      setFieldPath(detail.field);
    } finally { setBusy(false); }
  };

  const deleted = async (deletedRevision: string) => {
    if (!await onRefreshProject()) throw new Error('The authoritative definition projection could not be reloaded.');
    setMode({ kind: 'create' }); setDeleteOpen(false);
    setMessage({ kind: 'success', text: `Definition deleted at model revision ${deletedRevision}.` });
  };

  return <section className="definition-properties" aria-busy={busy}>
    <div className="definition-picker-row">
      <label className="property-field"><span>Definition</span><select aria-label="Definition" value={mode.kind === 'existing' ? mode.id : '__new__'} onChange={(event) => { setMessage(null); setMode(event.target.value === '__new__' ? { kind: 'create' } : { kind: 'existing', id: event.target.value }); }}>{definitions.map((item) => <option key={item.id} value={item.id}>{definitionSignature(item)}</option>)}<option value="__new__">New definition</option></select></label>
      <button type="button" onClick={() => { setMessage(null); setMode({ kind: 'create' }); }}>Add Definition</button>
    </div>
    {definitions.length === 0 && mode.kind === 'create' ? <div className="definition-empty"><strong>No definitions in this {ownerKind.toLowerCase()}</strong><span>Create a reusable OCL property or operation definition.</span></div> : null}
    <label className="property-field"><span>Definition kind</span><select aria-label="Definition kind" value={draft.kind} onChange={(event) => updateKind(event.target.value as OclDefinitionKindDto)}><option value="PROPERTY_DEF">Property</option><option value="OPERATION_DEF">Operation</option></select></label>
    <div className="operation-signature-grid">
      <Field label="Definition name" value={draft.name} error={fieldError(fieldPath, 'name')} onChange={(name) => setDraft((current) => ({ ...current, name }))} />
      <Field label="Result type" value={draft.resultType} error={fieldError(fieldPath, 'resultType')} onChange={(resultType) => setDraft((current) => ({ ...current, resultType }))} />
      <label className="property-field property-field-readonly"><span>Context</span><input value={`${ownerKind === 'CLASS' ? 'Class' : 'Package'} · ${ownerName}`} readOnly /></label>
    </div>
    {draft.kind === 'OPERATION_DEF' ? <section className="operation-parameters"><div className="property-section-header"><h5>Parameters</h5><button type="button" onClick={() => setDraft((current) => ({ ...current, parameters: [...current.parameters, newParameter(current.parameters.length)] }))}>Add Parameter</button></div>{draft.parameters.length === 0 ? <p className="property-empty">No parameters.</p> : null}{[...draft.parameters].sort(byPosition).map((parameter, index, ordered) => <div className="definition-parameter-row" key={parameter.id}><Field label={`Definition parameter ${index + 1} name`} value={parameter.name} error={fieldError(fieldPath, parameter.id)} onChange={(name) => updateParameter(parameter.id, { name })} /><Field label="Parameter type" value={parameter.type} onChange={(type) => updateParameter(parameter.id, { type })} /><div className="operation-parameter-actions"><button type="button" aria-label={`Move definition parameter ${index + 1} up`} disabled={index === 0} onClick={() => moveParameter(parameter.id, -1)}>Up</button><button type="button" aria-label={`Move definition parameter ${index + 1} down`} disabled={index === ordered.length - 1} onClick={() => moveParameter(parameter.id, 1)}>Down</button><button type="button" className="danger-button" onClick={() => setDraft((current) => ({ ...current, parameters: current.parameters.filter((item) => item.id !== parameter.id).map((item, position) => ({ ...item, position })) }))}>Remove</button></div></div>)}</section> : null}
    <label className="property-field ocl-expression-field"><span>OCL expression</span><textarea aria-label="OCL expression" rows={8} value={draft.expression} aria-invalid={Boolean(fieldError(fieldPath, 'expression')) || undefined} onChange={(event) => setDraft((current) => ({ ...current, expression: event.target.value }))} />{fieldError(fieldPath, 'expression') ? <small className="property-field-error">The backend rejected this expression.</small> : null}<small>{ownerKind === 'CLASS' ? `self : ${ownerName} is available. ` : 'Package definitions have no implicit self. '}Expected result: {draft.resultType}.</small></label>
    {draft.sourceRange ? <p className="definition-source-range">Source {draft.sourceRange.startLine}:{draft.sourceRange.startColumn}-{draft.sourceRange.endLine}:{draft.sourceRange.endColumn}</p> : null}
    {localError && dirty ? <p className="properties-message properties-message-error" role="alert">{localError}</p> : null}
    {message ? <p className={`properties-message properties-message-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
    <div className="properties-actions"><button type="button" disabled={!dirty || busy} onClick={() => setDraft(initial)}>Reset</button><button type="button" className="primary-button" disabled={Boolean(localError) || !revision || busy || (mode.kind === 'existing' && !dirty)} onClick={() => void save()}>{busy ? 'Saving...' : mode.kind === 'create' ? 'Create Definition' : 'Save Definition'}</button>{mode.kind === 'existing' ? <button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Delete Definition</button> : null}</div>
    {deleteOpen && mode.kind === 'existing' ? <DefinitionDeleteDialog project={project} definition={draft} fallbackRevision={revision} onCancel={() => setDeleteOpen(false)} onDeleted={deleted} /> : null}
  </section>;
}

function DefinitionDeleteDialog({ project, definition, fallbackRevision, onCancel, onDeleted }: { project: ProjectDto; definition: OclDefinitionElementDto; fallbackRevision: string; onCancel: () => void; onDeleted: (revision: string) => Promise<void> }) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void modelCommandApi.getDeleteImpact(project.project.id, 'DEFINITION', definition.id).then((value) => { if (active) setImpact(value); }).catch((caught) => { if (active) setError(definitionError(caught).message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [definition.id, project.project.id]);
  const blockers = impact?.references.filter((item) => !item.cascadeAllowed) ?? [];
  const cascades = impact?.references.filter((item) => item.cascadeAllowed) ?? [];
  const canDelete = Boolean(impact) && blockers.length === 0 && cascades.every((item) => selected.includes(item.referenceId)) && !busy;
  const remove = async () => { if (!impact || !canDelete) return; setBusy(true); setError(null); try { const result = await modelCommandApi.deleteElement(project.project.id, 'DEFINITION', definition.id, { expectedRevision: impact.revision || fallbackRevision, cascadeReferenceIds: selected }); await onDeleted(result.revision); appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Definition ${definition.qualifiedName} deleted at model revision ${result.revision}.` }); } catch (caught) { const current = impactFromError(caught); if (current) setImpact(current); setError(definitionError(caught).message); setBusy(false); } };
  return <div className="modal-backdrop" role="presentation"><div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-definition-title"><header className="modal-header"><h2 id="delete-definition-title">Delete Definition</h2><button type="button" className="icon-button" onClick={onCancel}>Close</button></header><div className="modal-body"><p>Delete <strong>{definitionSignature(definition)}</strong> from {definition.ownerName}?</p>{busy && !impact ? <p>Checking references...</p> : null}{impact?.references.length === 0 ? <p className="properties-message properties-message-success">No dependent references were found.</p> : null}{impact?.references.map((reference) => <div key={reference.referenceId} className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}><input aria-label={`Cascade ${reference.elementName}`} type="checkbox" disabled={!reference.cascadeAllowed} checked={selected.includes(reference.referenceId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} /><span><strong>{reference.elementName}</strong><small>{reference.relation}{reference.path ? ` · ${reference.path}` : ''}</small><ReferenceButton reference={reference} /></span></div>)}{error ? <p className="modal-form-error" role="alert">{error}</p> : null}</div><footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void remove()}>{busy ? 'Deleting...' : 'Delete Definition'}</button></footer></div></div>;
}

function ReferenceButton({ reference }: { reference: CommandElementReferenceDto }) {
  const selection = referenceSelection(reference);
  return selection ? <button type="button" className="delete-impact-navigation" onClick={() => appStoreActions.select(selection)}>Go to element</button> : null;
}

function referenceSelection(reference: CommandElementReferenceDto) {
  const type = reference.elementType.toUpperCase();
  if (type === 'CLASS' || type === 'PACKAGE' || type === 'INVARIANT') return { view: 'class-diagram' as const, type: type.toLowerCase() as 'class' | 'package' | 'invariant', id: reference.elementId };
  return null;
}

function Field({ label, value, error, onChange }: { label: string; value: string; error?: string | null; onChange: (value: string) => void }) { return <label className="property-field"><span>{label}</span><input value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)} />{error ? <small className="property-field-error">{error}</small> : null}</label>; }
function byPosition(left: UmlParameterDto, right: UmlParameterDto) { return (left.position ?? 0) - (right.position ?? 0); }
function newParameter(position: number): UmlParameterDto { return { id: `parameter-${crypto.randomUUID()}`, name: '', type: 'String', direction: 'IN', position }; }
function newDefinition(ownerKind: OclDefinitionOwnerKindDto, ownerId: string, ownerName: string): OclDefinitionElementDto { return { id: `definition-${crypto.randomUUID()}`, kind: 'PROPERTY_DEF', ownerKind, ownerId, ownerName, name: '', qualifiedName: `${ownerName}::`, resultType: 'String', parameters: [], expression: '', sourceRange: null }; }
function normalizeDefinition(value: OclDefinitionElementDto): OclDefinitionElementDto { return { ...value, parameters: value.kind === 'PROPERTY_DEF' ? [] : [...(value.parameters ?? [])].sort(byPosition).map((item, position) => ({ ...item, direction: 'IN', position })), sourceRange: value.sourceRange ?? null }; }
function definitionSignature(value: OclDefinitionElementDto) { const parameters = value.kind === 'OPERATION_DEF' ? `(${[...(value.parameters ?? [])].sort(byPosition).map((item) => `${item.name}: ${item.type}`).join(', ')})` : ''; return `${value.name}${parameters} : ${value.resultType}`; }
function validateDefinition(value: OclDefinitionElementDto) { if (!value.name.trim()) return 'Definition name is required.'; if (!value.resultType.trim()) return 'Result type is required.'; if (!value.expression.trim()) return 'OCL expression is required.'; if (value.kind === 'OPERATION_DEF' && value.parameters.some((item) => !item.name.trim() || !item.type.trim())) return 'Every parameter needs a name and type.'; const names = value.parameters.map((item) => item.name.trim()); if (new Set(names).size !== names.length) return 'Parameter names must be unique.'; return null; }
function fieldError(path: string | null, field: string) { return path && (path === field || path.includes(field)) ? 'The backend rejected this field.' : null; }
function impactFromError(error: unknown) { if (!(error instanceof ApiClientError)) return null; const value = error.dto.details?.currentImpact as Partial<DeleteImpactDto> | undefined; return value && typeof value.revision === 'string' && value.target && Array.isArray(value.references) ? value as DeleteImpactDto : null; }
function definitionError(error: unknown): { message: string; field: string | null } { if (error instanceof ApiClientError) { const detail = typeof error.dto.details?.field === 'string' ? error.dto.details.field : null; const field = detail ?? (error.dto.code.includes('PARAMETER') ? 'parameters' : error.dto.code.includes('OWNER') ? 'ownerId' : error.dto.code.includes('COMPILE') || error.dto.code.includes('SELF') || error.dto.code.includes('CYCLE') ? 'expression' : error.dto.code.includes('SIGNATURE') ? 'name' : null); return { message: `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`, field }; } return { message: error instanceof Error ? error.message : 'The definition command failed.', field: null }; }
