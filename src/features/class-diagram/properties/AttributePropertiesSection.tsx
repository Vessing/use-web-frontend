import { useEffect, useMemo, useState } from 'react';

import {
  ApiClientError,
  modelCommandApi,
  type ProjectDto,
  type UmlAttributeDto,
  type UmlClassDto,
  type UmlVisibilityDto,
} from '../../../api';
import { appStoreActions } from '../../../state';
import { TypeDirectedValueEditor } from '../../object-diagram/properties/TypeDirectedValueEditor';
import { TypePicker } from './TypePicker';

type AttributeMode = { kind: 'existing'; id: string } | { kind: 'create' };
type ValueSource = 'STORED' | 'INIT' | 'DERIVED';

interface Props {
  project: ProjectDto;
  umlClass: UmlClassDto;
  revision: string;
  onRefreshProject: () => Promise<boolean>;
}

export function AttributePropertiesSection({
  project,
  umlClass,
  revision,
  onRefreshProject,
}: Props) {
  const [mode, setMode] = useState<AttributeMode>(() =>
    umlClass.attributes[0]
      ? { kind: 'existing', id: umlClass.attributes[0].id }
      : { kind: 'create' },
  );
  const source =
    mode.kind === 'existing' ? umlClass.attributes.find((item) => item.id === mode.id) : undefined;
  const initial = useMemo(() => normalizeAttribute(source ?? newAttribute()), [source]);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fieldPath, setFieldPath] = useState<string | null>(null);
  const [validationRequested, setValidationRequested] = useState(false);
  const [pendingSource, setPendingSource] = useState<ValueSource | null>(null);

  useEffect(() => {
    setDraft(initial);
    setFieldPath(null);
    setValidationRequested(false);
    setPendingSource(null);
  }, [initial]);

  const valueSource = attributeValueSource(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const localError = !draft.name.trim()
    ? 'Attribute name is required.'
    : !draft.type.trim()
      ? 'Attribute type is required.'
      : valueSource === 'INIT' && !draft.initExpression?.trim()
        ? 'An init expression is required.'
        : valueSource === 'DERIVED' && !draft.deriveExpression?.trim()
          ? 'A derive expression is required.'
          : null;
  const visibleLocalError = validationRequested ? localError : null;
  const hasInstances = project.objectModel.objects.some((object) => object.classId === umlClass.id);

  const applySource = (next: ValueSource) => {
    setDraft((current) => ({
      ...current,
      derived: next === 'DERIVED',
      initExpression: next === 'INIT' ? (current.initExpression ?? '') : null,
      deriveExpression: next === 'DERIVED' ? (current.deriveExpression ?? '') : null,
    }));
    setPendingSource(null);
    setMessage(null);
  };

  const save = async () => {
    setValidationRequested(true);
    if (localError || !revision || busy) return;
    setBusy(true);
    setMessage(null);
    setFieldPath(null);
    try {
      const request = { expectedRevision: revision, draft: normalizeAttribute(draft) };
      const result =
        mode.kind === 'create'
          ? await modelCommandApi.createAttribute(project.project.id, umlClass.id, request)
          : await modelCommandApi.updateAttribute(
              project.project.id,
              umlClass.id,
              mode.id,
              request,
            );
      if (!(await onRefreshProject()))
        throw new Error('The authoritative attribute projection could not be reloaded.');
      if (mode.kind === 'create') setMode({ kind: 'existing', id: result.result.id });
      setMessage({
        kind: 'success',
        text: `Attribute saved at model revision ${result.revision}.`,
      });
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `Attribute ${result.result.name} saved at model revision ${result.revision}.`,
      });
    } catch (error) {
      const detail = commandError(error);
      setMessage({ kind: 'error', text: detail.message });
      setFieldPath(detail.field);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="attribute-properties" aria-busy={busy}>
      <div className="operation-picker-row">
        <label className="property-field">
          <span>Attribute</span>
          <select
            aria-label="Attribute"
            value={mode.kind === 'existing' ? mode.id : '__new__'}
            onChange={(event) => {
              setMessage(null);
              setFieldPath(null);
              setValidationRequested(false);
              setMode(
                event.target.value === '__new__'
                  ? { kind: 'create' }
                  : { kind: 'existing', id: event.target.value },
              );
            }}
          >
            {umlClass.attributes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.derived ? '/' : ''}
                {item.name} : {item.type}
              </option>
            ))}
            <option value="__new__"></option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setFieldPath(null);
            setValidationRequested(false);
            setDraft(normalizeAttribute(newAttribute()));
            setMode({ kind: 'create' });
          }}
        >
          Add Attribute
        </button>
      </div>
      <div className="operation-signature-grid">
        <Field
          label="Attribute name"
          value={draft.name}
          error={fieldError(fieldPath, 'name')}
          onChange={(name) => setDraft((current) => ({ ...current, name }))}
        />
        <TypePicker
          project={project}
          label="Attribute type"
          value={draft.type}
          allowStructured
          onChange={(type) =>
            setDraft((current) => ({
              ...current,
              type,
              classifierValue: current.staticAttribute ? { type, value: null } : null,
            }))
          }
        />
        <label className="property-field">
          <span>Visibility</span>
          <select
            value={draft.visibility ?? 'PUBLIC'}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                visibility: event.target.value as UmlVisibilityDto,
              }))
            }
          >
            {(['PUBLIC', 'PROTECTED', 'PACKAGE', 'PRIVATE'] as UmlVisibilityDto[]).map((item) => (
              <option key={item} value={item}>
                {item.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="value-source-control">
        <legend>Value source</legend>
        {(['STORED', 'INIT', 'DERIVED'] as ValueSource[]).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={valueSource === item}
            onClick={() =>
              item === 'DERIVED' && valueSource !== 'DERIVED' && hasInstances
                ? setPendingSource(item)
                : applySource(item)
            }
          >
            {item === 'STORED' ? 'Stored' : item === 'INIT' ? 'Init' : 'Derived'}
          </button>
        ))}
      </fieldset>
      {valueSource === 'STORED' ? (
        <p className="properties-help">Stored values are persisted as editable object slots.</p>
      ) : null}
      {valueSource === 'INIT' ? (
        <ExpressionField
          label="Init expression"
          value={draft.initExpression ?? ''}
          error={fieldError(fieldPath, 'initExpression')}
          onChange={(initExpression) => setDraft((current) => ({ ...current, initExpression }))}
          help="Evaluated once by the backend during atomic object creation. The resulting slot remains editable."
        />
      ) : null}
      {valueSource === 'DERIVED' ? (
        <ExpressionField
          label="Derive expression"
          value={draft.deriveExpression ?? ''}
          error={fieldError(fieldPath, 'deriveExpression')}
          onChange={(deriveExpression) => setDraft((current) => ({ ...current, deriveExpression }))}
          help={`Expected result: ${draft.type}. The backend evaluates this value for the current snapshot; no object slot is writable.`}
        />
      ) : null}
      <label className="operation-flag">
        <input
          type="checkbox"
          checked={Boolean(draft.staticAttribute)}
          onChange={(event) =>
            setDraft((current) => ({ ...current, staticAttribute: event.target.checked }))
          }
        />
        <span>Static attribute</span>
      </label>
      {draft.staticAttribute ? (
        <ClassifierValueEditor
          project={project}
          attribute={draft}
          errorPath={fieldPath}
          onChange={(classifierValue) => setDraft((current) => ({ ...current, classifierValue }))}
        />
      ) : null}
      {visibleLocalError ? (
        <p className="properties-message properties-message-error" role="alert">
          {visibleLocalError}
        </p>
      ) : null}
      {message ? (
        <p
          className={`properties-message properties-message-${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
      <div className="properties-actions">
        <button type="button" disabled={!dirty || busy} onClick={() => setDraft(initial)}>
          Reset
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={
            !revision || busy || (mode.kind === 'existing' && !dirty)
          }
          onClick={() => void save()}
        >
          {busy ? 'Saving...' : mode.kind === 'create' ? 'Create Attribute' : 'Save Attribute'}
        </button>
      </div>
      {!revision ? (
        <p className="properties-message properties-message-error">
          A model revision is required before attribute commands can run.
        </p>
      ) : null}
      {pendingSource ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="derive-impact-title"
          >
            <header className="modal-header">
              <h2 id="derive-impact-title">Change to Derived?</h2>
            </header>
            <div className="modal-body">
              <p>
                Existing slot values stop being authoritative. The backend will calculate{' '}
                <strong>/{draft.name}</strong> from the current snapshot.
              </p>
            </div>
            <footer className="modal-footer">
              <button type="button" onClick={() => setPendingSource(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => applySource(pendingSource)}
              >
                Use Derived
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClassifierValueEditor({
  project,
  attribute,
  errorPath,
  onChange,
}: {
  project: ProjectDto;
  attribute: UmlAttributeDto;
  errorPath: string | null;
  onChange: (value: { type: string; value: unknown } | null) => void;
}) {
  if (attribute.derived)
    return (
      <p className="properties-help">
        The derived Classifier value is calculated by the backend and is read-only.
      </p>
    );
  return (
    <section className="classifier-value-editor">
      <h4>Classifier Value</h4>
      <TypeDirectedValueEditor
        project={project}
        type={attribute.type}
        label="Classifier Value"
        value={attribute.classifierValue?.value ?? null}
        errorPath={errorPath}
        valuePath="classifierValue.value"
        onChange={(value) => onChange({ type: attribute.type, value })}
      />
      <small>One value owned by the Classifier; object instances receive no slot.</small>
    </section>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="property-field">
      <span>{label}</span>
      <input
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <small className="property-field-error">{error}</small> : null}
    </label>
  );
}

function ExpressionField({
  label,
  value,
  error,
  onChange,
  help,
}: {
  label: string;
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  help: string;
}) {
  return (
    <label className="property-field ocl-expression-field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        rows={7}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <small className="property-field-error">{error}</small> : null}
      <small>{help}</small>
    </label>
  );
}

function attributeValueSource(attribute: UmlAttributeDto): ValueSource {
  if (attribute.derived) return 'DERIVED';
  if (attribute.initExpression !== null && attribute.initExpression !== undefined) return 'INIT';
  return 'STORED';
}

function normalizeAttribute(attribute: UmlAttributeDto): UmlAttributeDto {
  return {
    id: attribute.id,
    name: attribute.name,
    type: attribute.type,
    derived: Boolean(attribute.derived),
    deriveExpression: attribute.derived ? (attribute.deriveExpression ?? '') : null,
    initExpression: attribute.derived ? null : (attribute.initExpression ?? null),
    visibility: attribute.visibility ?? 'PUBLIC',
    redefinedAttributeIds: attribute.redefinedAttributeIds ?? [],
    staticAttribute: Boolean(attribute.staticAttribute),
    classifierValue: attribute.staticAttribute ? (attribute.classifierValue ?? null) : null,
  };
}

function newAttribute(): UmlAttributeDto {
  return {
    id: `attribute-${crypto.randomUUID()}`,
    name: '',
    type: 'String',
    derived: false,
    deriveExpression: null,
    initExpression: null,
    visibility: 'PUBLIC',
    redefinedAttributeIds: [],
    staticAttribute: false,
    classifierValue: null,
  };
}

function fieldError(path: string | null, field: string) {
  return path && (path === field || path.includes(field))
    ? 'The backend rejected this field.'
    : null;
}

function commandError(error: unknown): { message: string; field: string | null } {
  if (error instanceof ApiClientError) {
    const detailField =
      typeof error.dto.details?.fieldPath === 'string'
        ? error.dto.details.fieldPath
        : typeof error.dto.details?.field === 'string'
          ? error.dto.details.field
          : null;
    const field =
      detailField ??
      (error.dto.code.includes('OCL') || error.dto.code.includes('DERIV')
        ? error.dto.code.includes('INIT')
          ? 'initExpression'
          : 'deriveExpression'
        : null);
    return { message: `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`, field };
  }
  return {
    message: error instanceof Error ? error.message : 'The attribute command failed.',
    field: null,
  };
}
