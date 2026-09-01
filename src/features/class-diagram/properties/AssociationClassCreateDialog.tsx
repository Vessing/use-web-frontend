import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto, UmlAttributeDto, UmlClassDto, UmlOperationDto, UmlVisibilityDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';

interface Props {
  project: ProjectDto;
  associationId: string;
  associationName: string;
  expectedRevision: string;
  onCancel: () => void;
  onRefreshProject: () => Promise<boolean>;
}

export function AssociationClassCreateDialog({ project, associationId, associationName, expectedRevision, onCancel, onRefreshProject }: Props) {
  const [classId] = useState(() => `class-${crypto.randomUUID()}`);
  const [name, setName] = useState('');
  const [packageId, setPackageId] = useState('');
  const [visibility, setVisibility] = useState<UmlVisibilityDto>('PUBLIC');
  const [attributes, setAttributes] = useState<UmlAttributeDto[]>([]);
  const [operations, setOperations] = useState<UmlOperationDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const packageName = useMemo(() => project.umlModel.packages?.find((item) => item.id === packageId)?.qualifiedName, [packageId, project.umlModel.packages]);
  const qualifiedName = packageName ? `${packageName}::${name.trim()}` : name.trim();
  const valid = Boolean(name.trim() && expectedRevision && attributes.every((item) => item.name.trim()) && operations.every((item) => item.name.trim()));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true); setError(null); setFieldErrors({});
    const draft: UmlClassDto = {
      id: classId,
      name: name.trim(),
      attributes,
      operations,
      abstractClass: false,
      superClassIds: [],
      visibility,
      packageId: packageId || null,
      qualifiedName,
    };
    try {
      const result = await modelCommandApi.createAssociationClass(project.project.id, associationId, { expectedRevision, draft });
      if (!await onRefreshProject()) throw new Error('The authoritative Association-Class projection could not be reloaded.');
      appStoreActions.markValidationStale();
      appStoreActions.select({ view: 'class-diagram', type: 'class', id: result.result.associationClass.id });
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Association Class "${result.result.associationClass.name}" created at model revision ${result.revision}.` });
      onCancel();
    } catch (caught) {
      setError(commandMessage(caught));
      setFieldErrors(commandFieldErrors(caught));
    } finally { setBusy(false); }
  };

  return <div className="modal-backdrop" role="presentation"><form className="modal-dialog association-class-create-dialog" role="dialog" aria-modal="true" aria-labelledby="association-class-create-title" onSubmit={submit} aria-busy={busy}>
    <header className="modal-header"><div><h2 id="association-class-create-title">Create Association Class</h2><p>Define the class and bind it atomically to {associationName}.</p></div><button type="button" className="icon-button" onClick={onCancel}>Close</button></header>
    <div className="modal-body">
      <label className="modal-field"><span>Class Name</span><input autoFocus value={name} aria-invalid={Boolean(fieldErrors.name) || undefined} onChange={(event) => { setName(event.target.value); clearError(); }} />{fieldErrors.name ? <small className="property-field-error">{fieldErrors.name}</small> : null}</label>
      <div className="modal-row-grid"><label className="modal-field"><span>Namespace</span><select value={packageId} onChange={(event) => { setPackageId(event.target.value); clearError(); }}><option value="">Model root</option>{(project.umlModel.packages ?? []).map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}</select></label><label className="modal-field"><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as UmlVisibilityDto)}><option value="PUBLIC">public (+)</option><option value="PACKAGE">package (~)</option><option value="PROTECTED">protected (#)</option><option value="PRIVATE">private (-)</option></select></label></div>
      <label className="modal-field"><span>Qualified Name</span><input value={qualifiedName} readOnly /></label>
      <label className="modal-field"><span>Linked Association</span><input value={associationName} readOnly /></label>
      <p className="properties-message properties-message-info">Each instance represents exactly one link of this Association.</p>
      <FeatureSection title="Initial Attributes" action="Add Attribute" onAdd={() => setAttributes((current) => [...current, newAttribute()])}>{attributes.length ? attributes.map((attribute, index) => <div className="association-class-feature-row" key={attribute.id}><label className="modal-field"><span>Attribute {index + 1} Name</span><input value={attribute.name} aria-invalid={Boolean(fieldErrors[`attributes.${attribute.id}.name`]) || undefined} onChange={(event) => setAttributes((current) => current.map((item) => item.id === attribute.id ? { ...item, name: event.target.value } : item))} /></label><label className="modal-field"><span>Type</span><select value={attribute.type} onChange={(event) => setAttributes((current) => current.map((item) => item.id === attribute.id ? { ...item, type: event.target.value } : item))}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><button type="button" className="icon-button danger-button" aria-label={`Remove attribute ${attribute.name || index + 1}`} onClick={() => setAttributes((current) => current.filter((item) => item.id !== attribute.id))}>Remove</button></div>) : <p className="modal-empty">No initial attributes.</p>}</FeatureSection>
      <FeatureSection title="Initial Operations" action="Add Operation" onAdd={() => setOperations((current) => [...current, newOperation()])}>{operations.length ? operations.map((operation, index) => <div className="association-class-feature-row" key={operation.id}><label className="modal-field"><span>Operation {index + 1} Name</span><input value={operation.name} aria-invalid={Boolean(fieldErrors[`operations.${operation.id}.name`]) || undefined} onChange={(event) => setOperations((current) => current.map((item) => item.id === operation.id ? { ...item, name: event.target.value } : item))} /></label><label className="modal-field"><span>Return Type</span><select value={operation.returnType} onChange={(event) => setOperations((current) => current.map((item) => item.id === operation.id ? { ...item, returnType: event.target.value } : item))}>{[...types, 'Void'].map((type) => <option key={type}>{type}</option>)}</select></label><button type="button" className="icon-button danger-button" aria-label={`Remove operation ${operation.name || index + 1}`} onClick={() => setOperations((current) => current.filter((item) => item.id !== operation.id))}>Remove</button></div>) : <p className="modal-empty">No initial operations.</p>}</FeatureSection>
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
      {!expectedRevision ? <p className="modal-form-error">The model revision is not available.</p> : null}
    </div>
    <footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button" disabled={!valid || busy}>{busy ? 'Creating...' : 'Create Association Class'}</button></footer>
  </form></div>;

  function clearError() { setError(null); setFieldErrors({}); }
}

function FeatureSection({ title, action, onAdd, children }: { title: string; action: string; onAdd: () => void; children: ReactNode }) { return <section className="modal-section"><div className="modal-section-header"><h3>{title}</h3><button type="button" onClick={onAdd}>{action}</button></div>{children}</section>; }
const types = ['String', 'Integer', 'Real', 'Boolean'];
function newAttribute(): UmlAttributeDto { return { id: `attribute-${crypto.randomUUID()}`, name: '', type: 'String', derived: false, deriveExpression: null, initExpression: null, visibility: 'PUBLIC', redefinedAttributeIds: [], staticAttribute: false, classifierValue: null }; }
function newOperation(): UmlOperationDto { return { id: `operation-${crypto.randomUUID()}`, name: '', returnType: 'Boolean', parameters: [], bodyExpression: null, visibility: 'PUBLIC', abstractOperation: false, query: false, staticOperation: false, contracts: [], redefinedOperationIds: [] }; }
function commandMessage(error: unknown) { return error instanceof ApiClientError ? `${error.dto.userMessage ?? error.message} (${error.dto.code})` : error instanceof Error ? error.message : 'The Association Class could not be created.'; }
function commandFieldErrors(error: unknown) { if (!(error instanceof ApiClientError)) return {}; const fields = { ...(error.dto.fieldErrors ?? {}) }; const targets = error.dto.details?.targets; if (Array.isArray(targets)) targets.forEach((target) => { if (isRecord(target) && typeof target.path === 'string') fields[target.path] = commandMessage(error); }); return fields; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
