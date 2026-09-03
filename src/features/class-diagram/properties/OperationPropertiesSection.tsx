import { useEffect, useMemo, useState } from 'react';

import {
  ApiClientError,
  modelCommandApi,
  type DeleteImpactDto,
  type CommandElementReferenceDto,
  type ProjectDto,
  type UmlClassDto,
  type UmlOperationDto,
  type UmlOperationContractDto,
  type UmlOperationContractKindDto,
  type UmlParameterDto,
  type UmlVisibilityDto,
} from '../../../api';
import { appStoreActions } from '../../../state';
import { TypePicker } from './TypePicker';

type OperationMode = { kind: 'existing'; id: string } | { kind: 'create' };
type Direction = 'IN' | 'OUT' | 'INOUT';
type OperationTab = 'signature' | 'pre' | 'post' | 'body';

interface Props {
  project: ProjectDto;
  umlClass: UmlClassDto;
  revision: string;
  onRefreshProject: () => Promise<boolean>;
}

export function OperationPropertiesSection({ project, umlClass, revision, onRefreshProject }: Props) {
  const [mode, setMode] = useState<OperationMode>(() =>
    umlClass.operations[0] ? { kind: 'existing', id: umlClass.operations[0].id } : { kind: 'create' },
  );
  const source = mode.kind === 'existing'
    ? umlClass.operations.find((operation) => operation.id === mode.id)
    : undefined;
  const initial = useMemo(() => normalizeOperation(source ?? newOperation()), [source]);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fieldPath, setFieldPath] = useState<string | null>(null);
  const [validationRequested, setValidationRequested] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState<OperationTab>('signature');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractDeleteOpen, setContractDeleteOpen] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setFieldPath(null);
    setValidationRequested(false);
    setSelectedContractId(null);
    setContractDeleteOpen(false);
  }, [initial]);

  const localError = validateDraft(draft);
  const visibleLocalError = validationRequested ? localError : null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const save = async () => {
    setValidationRequested(true);
    if (localError || !revision || busy) return;
    setBusy(true);
    setMessage(null);
    setFieldPath(null);
    try {
      const request = { expectedRevision: revision, draft: normalizeOperation(draft) };
      const result = mode.kind === 'create'
        ? await modelCommandApi.createOperation(project.project.id, umlClass.id, request)
        : await modelCommandApi.updateOperation(project.project.id, umlClass.id, mode.id, request);
      if (!await onRefreshProject()) {
        throw new Error('The authoritative operation projection could not be reloaded.');
      }
      if (mode.kind === 'create') setMode({ kind: 'existing', id: result.result.id });
      setMessage({ kind: 'success', text: `Operation saved at model revision ${result.revision}.` });
      appStoreActions.addConsoleLog({
        level: 'info', source: 'api',
        message: `Operation ${result.result.name} saved at model revision ${result.revision}.`,
      });
    } catch (error) {
      const detail = operationError(error);
      setMessage({ kind: 'error', text: detail.message });
      setFieldPath(detail.field);
    } finally {
      setBusy(false);
    }
  };

  const updateParameter = (id: string, patch: Partial<UmlParameterDto>) => {
    setDraft((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) => parameter.id === id ? { ...parameter, ...patch } : parameter),
    }));
  };
  const moveParameter = (id: string, offset: number) => {
    setDraft((current) => {
      const ordered = [...current.parameters].sort(byPosition);
      const index = ordered.findIndex((parameter) => parameter.id === id);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= ordered.length) return current;
      [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
      return { ...current, parameters: ordered.map((parameter, position) => ({ ...parameter, position })) };
    });
  };
  const operationDeleted = async (deletedRevision: string) => {
    if (!await onRefreshProject()) {
      throw new Error('The authoritative operation projection could not be reloaded.');
    }
    setMode({ kind: 'create' });
    setDeleteOpen(false);
    setMessage({ kind: 'success', text: `Operation deleted at model revision ${deletedRevision}.` });
    appStoreActions.select({ view: 'class-diagram', type: 'class', id: umlClass.id });
  };

  const contracts = draft.contracts ?? [];
  const visibleContracts = contracts.filter((contract) => contract.kind === (tab === 'pre' ? 'PRE' : 'POST'));
  const selectedContract = visibleContracts.find((contract) => contract.id === selectedContractId) ?? visibleContracts[0];
  const selectTab = (next: OperationTab) => {
    setTab(next);
    setSelectedContractId(null);
    setContractDeleteOpen(false);
    setMessage(null);
  };
  const addContract = (kind: UmlOperationContractKindDto) => {
    const contract = newContract(kind);
    setDraft((current) => ({ ...current, contracts: [...(current.contracts ?? []), contract] }));
    setTab(kind === 'PRE' ? 'pre' : 'post');
    setSelectedContractId(contract.id);
    setMessage(null);
  };
  const updateContract = (id: string, patch: Partial<UmlOperationContractDto>) => {
    setDraft((current) => ({ ...current, contracts: (current.contracts ?? []).map((contract) => contract.id === id ? { ...contract, ...patch } : contract) }));
  };
  const deleteContract = () => {
    if (!selectedContract) return;
    setDraft((current) => ({ ...current, contracts: (current.contracts ?? []).filter((contract) => contract.id !== selectedContract.id) }));
    setSelectedContractId(null);
    setContractDeleteOpen(false);
    setMessage({ kind: 'success', text: `${selectedContract.kind === 'PRE' ? 'Precondition' : 'Postcondition'} removed from the draft. Save the operation to persist this change.` });
  };

  return (
    <div className="operation-properties" aria-busy={busy}>
      <div className="operation-picker-row">
        <label className="property-field">
          <span>Operation</span>
          <select
            aria-label="Operation"
            value={mode.kind === 'existing' ? mode.id : '__new__'}
            onChange={(event) => { setMessage(null); setValidationRequested(false); setMode(event.target.value === '__new__' ? { kind: 'create' } : { kind: 'existing', id: event.target.value }); }}
          >
            {umlClass.operations.map((operation) => <option key={operation.id} value={operation.id}>{signature(operation)}</option>)}
            <option value="__new__"></option>
          </select>
        </label>
        <button type="button" onClick={() => { setMessage(null); setFieldPath(null); setValidationRequested(false); setDraft(normalizeOperation(newOperation())); setMode({ kind: 'create' }); }}>Add Operation</button>
      </div>

      <div className="operation-contract-tabs" role="tablist" aria-label="Operation details">
        <button type="button" role="tab" aria-selected={tab === 'signature'} onClick={() => selectTab('signature')}>Signature</button>
        <button type="button" role="tab" aria-selected={tab === 'pre'} onClick={() => selectTab('pre')}>Preconditions · {contracts.filter((contract) => contract.kind === 'PRE').length}</button>
        <button type="button" role="tab" aria-selected={tab === 'post'} onClick={() => selectTab('post')}>Postconditions · {contracts.filter((contract) => contract.kind === 'POST').length}</button>
        <button type="button" role="tab" aria-selected={tab === 'body'} onClick={() => selectTab('body')}>Body</button>
      </div>

      {tab === 'signature' ? <>
      <div className="operation-signature-grid">
        <Field label="Name" value={draft.name} error={fieldError(fieldPath, 'name') ?? (validationRequested && !draft.name.trim() ? 'Required' : null)} onChange={(name) => setDraft((current) => ({ ...current, name }))} />
        <TypePicker project={project} label="Return type" value={draft.returnType} allowVoid onChange={(returnType) => setDraft((current) => ({ ...current, returnType }))} />
        <label className="property-field"><span>Visibility</span><select value={draft.visibility ?? 'PUBLIC'} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as UmlVisibilityDto }))}>{(['PUBLIC', 'PRIVATE', 'PROTECTED', 'PACKAGE'] as UmlVisibilityDto[]).map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></label>
      </div>

      <div className="operation-flag-grid">
        <Flag label="Static" checked={Boolean(draft.staticOperation)} onChange={(staticOperation) => setDraft((current) => ({ ...current, staticOperation }))} />
        <Flag label="Query" checked={Boolean(draft.query)} onChange={(query) => setDraft((current) => ({ ...current, query, isQuery: query }))} />
        <Flag label="Abstract" checked={Boolean(draft.abstractOperation)} onChange={(abstractOperation) => setDraft((current) => ({ ...current, abstractOperation, bodyExpression: abstractOperation ? null : current.bodyExpression }))} />
      </div>

      <section className="operation-parameters" aria-labelledby="operation-parameters-title">
        <div className="property-section-header"><h4 id="operation-parameters-title">Parameters</h4><button type="button" onClick={() => setDraft((current) => ({ ...current, parameters: [...current.parameters, newParameter(current.parameters.length)] }))}>Add Parameter</button></div>
        {draft.parameters.length === 0 ? <p className="property-empty">No parameters defined.</p> : null}
        {[...draft.parameters].sort(byPosition).map((parameter, index, ordered) => (
          <div key={parameter.id} className="operation-parameter-row">
            <Field label={`Parameter ${index + 1} name`} value={parameter.name} error={fieldError(fieldPath, `parameters.${parameter.id}`) ?? (validationRequested && !parameter.name.trim() ? 'Required' : null)} onChange={(name) => updateParameter(parameter.id, { name })} />
            <TypePicker project={project} label="Type" value={parameter.type} onChange={(type) => updateParameter(parameter.id, { type })} />
            <label className="property-field"><span>Direction</span><select value={direction(parameter.direction)} onChange={(event) => updateParameter(parameter.id, { direction: event.target.value as Direction })}><option value="IN">in</option><option value="OUT">out</option><option value="INOUT">inout</option></select></label>
            <div className="operation-parameter-actions" aria-label={`Order ${parameter.name || `parameter ${index + 1}`}`}>
              <button type="button" disabled={index === 0} onClick={() => moveParameter(parameter.id, -1)} aria-label={`Move ${parameter.name || `parameter ${index + 1}`} up`}>Up</button>
              <button type="button" disabled={index === ordered.length - 1} onClick={() => moveParameter(parameter.id, 1)} aria-label={`Move ${parameter.name || `parameter ${index + 1}`} down`}>Down</button>
              <button type="button" className="danger-button" onClick={() => setDraft((current) => ({ ...current, parameters: current.parameters.filter((candidate) => candidate.id !== parameter.id).map((candidate, position) => ({ ...candidate, position })) }))}>Remove</button>
            </div>
          </div>
        ))}
      </section>
      </> : tab === 'body' ? <BodyEditor operation={draft} ownerName={umlClass.name} fieldPath={fieldPath} onChange={(bodyExpression) => setDraft((current) => ({ ...current, bodyExpression }))} /> : <ContractEditor
        kind={tab === 'pre' ? 'PRE' : 'POST'}
        operation={draft}
        ownerName={umlClass.name}
        contracts={visibleContracts}
        selected={selectedContract}
        fieldPath={fieldPath}
        deleteOpen={contractDeleteOpen}
        onSelect={(id) => { setSelectedContractId(id); setContractDeleteOpen(false); }}
        onAdd={() => addContract(tab === 'pre' ? 'PRE' : 'POST')}
        onChange={updateContract}
        onRequestDelete={() => setContractDeleteOpen(true)}
        onCancelDelete={() => setContractDeleteOpen(false)}
        onDelete={deleteContract}
      />}

      {visibleLocalError ? <p className="properties-message properties-message-error" role="alert">{visibleLocalError}</p> : null}
      {message ? <p className={`properties-message properties-message-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
      <div className="properties-actions">
        <button type="button" disabled={!dirty || busy} onClick={() => { setDraft(initial); setMessage(null); setFieldPath(null); setValidationRequested(false); }}>Reset</button>
        <button type="button" className="primary-button" disabled={!revision || busy || (mode.kind === 'existing' && !dirty)} onClick={() => void save()}>{busy ? 'Saving...' : mode.kind === 'create' ? 'Create Operation' : tab === 'signature' ? 'Save Operation' : tab === 'body' ? 'Save Body' : 'Save Contract'}</button>
        {mode.kind === 'existing' ? <button type="button" className="danger-button" disabled={busy} onClick={() => setDeleteOpen(true)}>Delete Operation</button> : null}
      </div>
      {!revision ? <p className="properties-message properties-message-error">A model revision is required before operation commands can run.</p> : null}
      {deleteOpen && mode.kind === 'existing' ? <OperationDeleteDialog project={project} operation={draft} fallbackRevision={revision} onCancel={() => setDeleteOpen(false)} onDeleted={operationDeleted} /> : null}
    </div>
  );
}

function BodyEditor({ operation, ownerName, fieldPath, onChange }: { operation: UmlOperationDto; ownerName: string; fieldPath: string | null; onChange: (value: string | null) => void }) {
  const enabled = Boolean(operation.query) && !operation.abstractOperation;
  return <section className="operation-body-editor" aria-label="Operation body editor">
    <header className="property-section-header"><div><h4>OCL Query Body</h4><span>{ownerName}::{operation.name || 'new operation'}</span></div><span className={`property-status-badge ${enabled ? '' : 'property-status-disabled'}`}>{enabled ? 'QUERY' : 'READ ONLY'}</span></header>
    {!enabled ? <div className="properties-message properties-message-warning"><strong>OCL body not available</strong><br />Open the Signature tab, enable Query, and turn off Abstract. OCL bodies are available only for side-effect-free query operations; executable bodies that modify objects or links are not supported.</div> : null}
    <label className="property-field ocl-expression-field"><span>OCL body expression</span><textarea aria-label="OCL body expression" rows={10} disabled={!enabled} value={operation.bodyExpression ?? ''} aria-invalid={Boolean(fieldError(fieldPath, 'bodyExpression')) || undefined} onChange={(event) => onChange(event.target.value || null)} />{fieldError(fieldPath, 'bodyExpression') ? <small className="property-field-error">The backend rejected this operation body.</small> : null}</label>
    <div className="operation-contract-context"><strong>Available context</strong><code>self : {ownerName}</code>{operation.parameters.map((parameter) => <code key={parameter.id}>{parameter.name || parameter.id} : {parameter.type}</code>)}<span>Expected result: {operation.returnType}. Typechecking and evaluation are performed by the backend.</span></div>
    {enabled && !operation.bodyExpression ? <div className="operation-contract-empty"><strong>No OCL body defined</strong><span>This query requires a body or a registered backend implementation before invocation.</span></div> : null}
    {enabled && operation.bodyExpression ? <button type="button" className="danger-button" onClick={() => onChange(null)}>Remove Body</button> : null}
  </section>;
}

function ContractEditor({ kind, operation, ownerName, contracts, selected, fieldPath, deleteOpen, onSelect, onAdd, onChange, onRequestDelete, onCancelDelete, onDelete }: {
  kind: UmlOperationContractKindDto;
  operation: UmlOperationDto;
  ownerName: string;
  contracts: UmlOperationContractDto[];
  selected?: UmlOperationContractDto;
  fieldPath: string | null;
  deleteOpen: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<UmlOperationContractDto>) => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const label = kind === 'PRE' ? 'precondition' : 'postcondition';
  return <section className="operation-contract-editor" aria-label={`${kind === 'PRE' ? 'Preconditions' : 'Postconditions'} editor`}>
    <div className="property-section-header"><div><h4>{kind === 'PRE' ? 'Preconditions' : 'Postconditions'}</h4><span>{ownerName}::{operation.name || 'new operation'}</span></div><button type="button" onClick={onAdd}>Add {label}</button></div>
    {contracts.length === 0 ? <div className="operation-contract-empty"><strong>No {kind === 'PRE' ? 'preconditions' : 'postconditions'} defined</strong><span>Add a Boolean OCL contract to this operation.</span></div> : <div className="operation-contract-list" role="list" aria-label={`${kind} contracts`}>{contracts.map((contract) => <button key={contract.id} type="button" role="listitem" className={contract.id === selected?.id ? 'selected' : ''} onClick={() => onSelect(contract.id)}><span className={`contract-kind contract-kind-${kind.toLowerCase()}`}>{kind}</span><strong>{contract.name || `New ${label}`}</strong><small>{contract.enabled ? 'Enabled' : 'Disabled'}</small></button>)}</div>}
    {selected ? <div className="operation-contract-form">
      <label className="property-field"><span>Name</span><input value={selected.name} aria-invalid={Boolean(fieldError(fieldPath, `contracts.${selected.id}.name`)) || undefined} onChange={(event) => onChange(selected.id, { name: event.target.value })} />{fieldError(fieldPath, `contracts.${selected.id}.name`) ? <small className="property-field-error">The backend rejected this contract name.</small> : null}</label>
      <label className="operation-flag"><input type="checkbox" checked={selected.enabled} onChange={(event) => onChange(selected.id, { enabled: event.target.checked })} /><span>Enabled</span></label>
      <label className="property-field"><span>OCL expression</span><textarea rows={7} value={selected.expression} aria-invalid={Boolean(fieldError(fieldPath, `contracts.${selected.id}`)) || undefined} onChange={(event) => onChange(selected.id, { expression: event.target.value })} /></label>
      <div className="operation-contract-context"><strong>Available context</strong><code>self : {ownerName}</code>{operation.parameters.map((parameter) => <code key={parameter.id}>{parameter.name || parameter.id} : {parameter.type}</code>)}{kind === 'POST' && operation.returnType !== 'Void' ? <code>result : {operation.returnType}</code> : null}{kind === 'POST' ? <code>@pre · oclIsNew()</code> : null}<span>Expected result: Boolean. Validation and evaluation are performed by the backend.</span></div>
      <div className="operation-contract-actions"><button type="button" className="danger-button" onClick={onRequestDelete}>Delete {label}</button></div>
      {deleteOpen ? <div className="operation-contract-confirmation" role="alertdialog" aria-label={`Delete ${label}`}><strong>Remove {selected.name || `this ${label}`}?</strong><span>The change remains in the local draft until it is saved.</span><div><button type="button" onClick={onCancelDelete}>Cancel</button><button type="button" className="danger-button" onClick={onDelete}>Remove from draft</button></div></div> : null}
    </div> : null}
  </section>;
}

function OperationDeleteDialog({ project, operation, fallbackRevision, onCancel, onDeleted }: { project: ProjectDto; operation: UmlOperationDto; fallbackRevision: string; onCancel: () => void; onDeleted: (revision: string) => Promise<void> }) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void modelCommandApi.getDeleteImpact(project.project.id, 'OPERATION', operation.id)
      .then((value) => { if (active) setImpact(value); })
      .catch((caught) => { if (active) setError(operationError(caught).message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [operation.id, project.project.id]);
  const blockers = impact?.references.filter((reference) => !reference.cascadeAllowed) ?? [];
  const cascades = impact?.references.filter((reference) => reference.cascadeAllowed) ?? [];
  const ownerName = operationOwnerName(project, operation.id);
  const canDelete = Boolean(impact) && blockers.length === 0 && cascades.every((reference) => selected.includes(reference.referenceId)) && !busy;
  const remove = async () => {
    if (!impact || !canDelete) return;
    setBusy(true); setError(null);
    try {
      const result = await modelCommandApi.deleteElement(project.project.id, 'OPERATION', operation.id, { expectedRevision: impact.revision || fallbackRevision, cascadeReferenceIds: selected });
      await onDeleted(result.revision);
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Operation ${operation.name} deleted at model revision ${result.revision}.` });
    } catch (caught) {
      const currentImpact = impactFromError(caught);
      if (currentImpact) {
        setImpact(currentImpact);
        const allowed = new Set(currentImpact.references.filter((reference) => reference.cascadeAllowed).map((reference) => reference.referenceId));
        setSelected((current) => current.filter((referenceId) => allowed.has(referenceId)));
      }
      setError(operationError(caught).message); setBusy(false);
    }
  };
  return <div className="modal-backdrop" role="presentation"><div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-operation-title"><header className="modal-header"><h2 id="delete-operation-title">Delete Operation</h2><button type="button" className="icon-button" onClick={onCancel}>Close</button></header><div className="modal-body"><p>Delete <strong>{operation.name}</strong>?</p><p className="modal-hint">Defined by {ownerName}.</p>{busy && !impact ? <p>Checking references...</p> : null}{impact?.references.length === 0 ? <p className="properties-message properties-message-success">No dependent references were found.</p> : null}{impact?.references.map((reference) => <div key={reference.referenceId} className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}><input type="checkbox" aria-label={`Cascade ${reference.elementName}`} disabled={!reference.cascadeAllowed} checked={selected.includes(reference.referenceId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} /><span><strong>{reference.elementName}</strong><small>{reference.relation}{reference.cascadeAllowed ? ' / select to cascade' : ' / blocks deletion'}</small>{canNavigateToReference(project, reference) ? <button type="button" className="delete-impact-navigation" onClick={() => { onCancel(); window.setTimeout(() => navigateToReference(project, reference), 0); }}>Go to element</button> : null}</span></div>)}{error ? <p className="modal-form-error" role="alert">{error}</p> : null}</div><footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void remove()}>{busy ? 'Deleting...' : 'Delete Operation'}</button></footer></div></div>;
}

function operationOwnerName(project: ProjectDto, operationId: string) {
  return project.umlModel.classes.find((candidate) => candidate.operations.some((operation) => operation.id === operationId))?.name ?? 'the backend-resolved classifier';
}

function impactFromError(error: unknown) {
  if (!(error instanceof ApiClientError)) return null;
  const candidate = error.dto.details?.currentImpact;
  if (!candidate || typeof candidate !== 'object') return null;
  const impact = candidate as Partial<DeleteImpactDto>;
  return typeof impact.revision === 'string' && Array.isArray(impact.references) && impact.target ? impact as DeleteImpactDto : null;
}

function canNavigateToReference(project: ProjectDto, reference: CommandElementReferenceDto) {
  return Boolean(referenceSelection(project, reference));
}

function navigateToReference(project: ProjectDto, reference: CommandElementReferenceDto) {
  const selection = referenceSelection(project, reference);
  if (selection) appStoreActions.select(selection);
}

function referenceSelection(project: ProjectDto, reference: CommandElementReferenceDto) {
  switch (reference.elementType.toUpperCase()) {
    case 'CLASS': return { view: 'class-diagram' as const, type: 'class' as const, id: reference.elementId };
    case 'ASSOCIATION': return { view: 'class-diagram' as const, type: 'association' as const, id: reference.elementId };
    case 'INVARIANT': return { view: 'class-diagram' as const, type: 'invariant' as const, id: reference.elementId };
    case 'PACKAGE': return { view: 'class-diagram' as const, type: 'package' as const, id: reference.elementId };
    case 'IMPORT': return { view: 'class-diagram' as const, type: 'import' as const, id: reference.elementId };
    case 'OBJECT': return { view: 'object-diagram' as const, type: 'object' as const, id: reference.elementId };
    case 'OBJECT_LINK': return { view: 'object-diagram' as const, type: 'objectLink' as const, id: reference.elementId };
    case 'ATTRIBUTE':
    case 'OPERATION': {
      const owner = project.umlModel.classes.find((candidate) => candidate.attributes.some((attribute) => attribute.id === reference.elementId) || candidate.operations.some((operation) => operation.id === reference.elementId));
      return owner ? { view: 'class-diagram' as const, type: 'class' as const, id: owner.id } : null;
    }
    default: return null;
  }
}

function Field({ label, value, error, onChange }: { label: string; value: string; error?: string | null; onChange: (value: string) => void }) {
  return <label className="property-field"><span>{label}</span><input value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)} />{error ? <small className="property-field-error">{error}</small> : null}</label>;
}

function Flag({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="operation-flag"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function normalizeOperation(operation: UmlOperationDto): UmlOperationDto {
  return { ...operation, visibility: operation.visibility ?? 'PUBLIC', query: operation.query ?? operation.isQuery ?? false, isQuery: operation.query ?? operation.isQuery ?? false, abstractOperation: operation.abstractOperation ?? false, staticOperation: operation.staticOperation ?? false, bodyExpression: operation.abstractOperation ? null : operation.bodyExpression ?? null, contracts: operation.contracts ?? [], redefinedOperationIds: operation.redefinedOperationIds ?? [], parameters: [...(operation.parameters ?? [])].sort(byPosition).map((parameter, position) => ({ ...parameter, direction: direction(parameter.direction), position })) };
}

function newOperation(): UmlOperationDto {
  return { id: `operation-${crypto.randomUUID()}`, name: '', returnType: 'Void', parameters: [], visibility: 'PUBLIC', query: false, isQuery: false, abstractOperation: false, staticOperation: false, bodyExpression: null, contracts: [], redefinedOperationIds: [] };
}

function newParameter(position: number): UmlParameterDto {
  return { id: `parameter-${crypto.randomUUID()}`, name: '', type: 'String', direction: 'IN', position };
}

function newContract(kind: UmlOperationContractKindDto): UmlOperationContractDto {
  return { id: `contract-${crypto.randomUUID()}`, name: '', kind, expression: '', enabled: true };
}

function direction(value: UmlParameterDto['direction']): Direction {
  const normalized = (value ?? 'IN').toUpperCase();
  return normalized === 'OUT' || normalized === 'INOUT' ? normalized : 'IN';
}

function byPosition(left: UmlParameterDto, right: UmlParameterDto) {
  return (left.position ?? 0) - (right.position ?? 0);
}

function validateDraft(draft: UmlOperationDto) {
  if (!draft.name.trim()) return 'Operation name is required.';
  if (!draft.returnType.trim()) return 'Return type is required.';
  if (draft.parameters.some((parameter) => !parameter.name.trim() || !parameter.type.trim())) return 'Every parameter needs a name and type.';
  const names = draft.parameters.map((parameter) => parameter.name.trim());
  if (new Set(names).size !== names.length) return 'Parameter names must be unique.';
  const contracts = draft.contracts ?? [];
  if (contracts.some((contract) => !contract.name.trim() || !contract.expression.trim())) return 'Every operation contract needs a name and OCL expression.';
  if (new Set(contracts.map((contract) => contract.id)).size !== contracts.length) return 'Operation contract IDs must be unique.';
  if (draft.bodyExpression?.trim() && (!draft.query || draft.abstractOperation)) return 'An OCL body requires a non-abstract query operation.';
  return null;
}

function signature(operation: UmlOperationDto) {
  const parameters = [...(operation.parameters ?? [])].sort(byPosition).map((parameter) => `${parameter.name}: ${parameter.type}`).join(', ');
  return `${operation.name}(${parameters}) : ${operation.returnType}`;
}

function fieldError(path: string | null, field: string) {
  return path && (path === field || path.includes(field) || field.includes(path)) ? 'The backend rejected this field.' : null;
}

function operationError(error: unknown): { message: string; field: string | null } {
  if (error instanceof ApiClientError) {
    const field = typeof error.dto.details?.field === 'string'
      ? error.dto.details.field
      : error.dto.code.includes('BODY') ? 'bodyExpression'
        : error.dto.code.includes('OCL') || error.dto.code.includes('CONTRACT') ? 'contracts' : null;
    return { message: `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`, field };
  }
  return { message: error instanceof Error ? error.message : 'The operation command failed.', field: null };
}
