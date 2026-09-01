import { useState, type FormEvent, type ReactNode } from 'react';

import { ApiClientError, snapshotCommandApi, type ProjectDto } from '../../../api';
import { appStoreActions, type ModalState } from '../../../state';
import { TypeDirectedValueEditor } from '../properties/TypeDirectedValueEditor';
import { NaryObjectLinkModal } from './NaryObjectLinkModal';

interface ObjectDiagramModalsProps {
  modal: Exclude<ModalState, null>;
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}

type ObjectDiagramModalState = Extract<
  Exclude<ModalState, null>,
  { type: 'addObject' | 'addObjectAssociation' }
>;

export function ObjectDiagramModals({
  modal,
  project,
  expectedRevision,
  onRefreshProject,
}: ObjectDiagramModalsProps) {
  if (!isObjectDiagramModal(modal)) {
    return null;
  }

  if (modal.type === 'addObject') {
    return (
      <AddObjectModal
        modal={modal}
        project={project}
        expectedRevision={expectedRevision}
        onRefreshProject={onRefreshProject}
      />
    );
  }

  return (
    <NaryObjectLinkModal
      modal={modal}
      project={project}
      expectedRevision={expectedRevision}
      onRefreshProject={onRefreshProject}
    />
  );
}

function AddObjectModal({
  modal,
  project,
  expectedRevision,
  onRefreshProject,
}: {
  modal: Extract<ObjectDiagramModalState, { type: 'addObject' }>;
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}) {
  const classes = project.umlModel.classes;
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(modal.classId ?? classes[0]?.id ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFieldPath, setErrorFieldPath] = useState<string | null>(null);
  const [errorAttributeId, setErrorAttributeId] = useState<string | null>(null);
  const selectedClass = classes.find((item) => item.id === classId);
  const attributes = effectiveStoredAttributes(project, classId);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const trimmedName = name.trim();
  const hasDuplicateName = project.objectModel.objects.some(
    (object) => object.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  );
  const canSubmit =
    classes.length > 0 &&
    trimmedName.length > 0 &&
    classId.length > 0 &&
    !hasDuplicateName &&
    !selectedClass?.abstract &&
    Boolean(expectedRevision) &&
    !busy;

  return (
    <ModalShell
      title="Add Object"
      submitLabel="Create Object"
      canSubmit={canSubmit}
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit) {
          return;
        }

        setBusy(true);
        setError(null);
        setErrorFieldPath(null);
        setErrorAttributeId(null);
        try {
          const objectId = `object-${crypto.randomUUID()}`;
          const result = await snapshotCommandApi.createObject(project.project.id, {
            expectedRevision,
            draft: {
              id: objectId,
              name: trimmedName,
              classId,
              slots: attributes.map((attribute) => ({
                id: `slot-${crypto.randomUUID()}`,
                attributeId: attribute.id,
                value: { type: attribute.type, value: values[attribute.id] ?? null },
                valueType: attribute.type,
                isUnset: (values[attribute.id] ?? null) === null,
              })),
            },
          });
          if (!(await onRefreshProject()))
            throw new Error('The authoritative object projection could not be reloaded.');
          appStoreActions.select({ view: 'object-diagram', type: 'object', id: result.result.id });
          appStoreActions.closeModal();
        } catch (cause) {
          if (cause instanceof ApiClientError) {
            setErrorFieldPath(
              typeof cause.dto.details?.fieldPath === 'string' ? cause.dto.details.fieldPath : null,
            );
            setErrorAttributeId(
              typeof cause.dto.details?.attributeId === 'string'
                ? cause.dto.details.attributeId
                : null,
            );
          }
          setError(
            cause instanceof ApiClientError
              ? `${cause.dto.code}: ${cause.dto.userMessage ?? cause.dto.message}`
              : cause instanceof Error
                ? cause.message
                : 'The object command failed.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {classes.length === 0 ? (
        <p className="modal-form-error">Create a class before adding objects.</p>
      ) : null}
      <ModalTextField
        label="Object Name"
        value={name}
        autoFocus
        error={submitted && !trimmedName ? 'Object name is required.' : null}
        onChange={setName}
      />
      {submitted && hasDuplicateName ? (
        <p className="modal-form-error">Object name must be unique.</p>
      ) : null}
      <ModalClassSelect
        label="Type"
        classes={classes}
        value={classId}
        onChange={(next) => {
          setClassId(next);
          setValues({});
          setError(null);
          setErrorFieldPath(null);
          setErrorAttributeId(null);
        }}
      />
      {selectedClass?.abstract ? (
        <p className="modal-form-error">Abstract Classes cannot be instantiated.</p>
      ) : null}
      <section className="modal-initial-values">
        <h3>Initial Attribute Values</h3>
        {attributes.length ? (
          attributes.map((attribute) => (
            <TypeDirectedValueEditor
              key={attribute.id}
              project={project}
              type={attribute.type}
              label={attribute.name}
              value={values[attribute.id] ?? null}
              errorPath={
                !errorAttributeId || errorAttributeId === attribute.id ? errorFieldPath : null
              }
              onChange={(value) => {
                setValues((current) => ({ ...current, [attribute.id]: value }));
                setError(null);
                setErrorFieldPath(null);
                setErrorAttributeId(null);
              }}
            />
          ))
        ) : (
          <p className="property-empty">No stored instance attributes.</p>
        )}
      </section>
      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}
      {!expectedRevision ? (
        <p className="modal-form-error">A snapshot revision is required.</p>
      ) : null}
    </ModalShell>
  );
}

interface ModalShellProps {
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function ModalShell({ title, submitLabel, canSubmit, children, onSubmit }: ModalShellProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-modal-title"
        onSubmit={onSubmit}
      >
        <header className="modal-header">
          <h2 id="object-modal-title">{title}</h2>
          <button type="button" className="icon-button" onClick={appStoreActions.closeModal}>
            Close
          </button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-footer">
          <button type="button" onClick={appStoreActions.closeModal}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!canSubmit}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ModalTextField({
  label,
  value,
  autoFocus = false,
  error,
  onChange,
}: {
  label: string;
  value: string;
  autoFocus?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      <input
        value={value}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <small className="property-field-error">{error}</small> : null}
    </label>
  );
}

function ModalClassSelect({
  label,
  classes,
  value,
  onChange,
}: {
  label: string;
  classes: ProjectDto['umlModel']['classes'];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {classes.map((umlClass) => (
          <option key={umlClass.id} value={umlClass.id} disabled={Boolean(umlClass.abstract)}>
            {umlClass.qualifiedName ?? umlClass.name}
            {umlClass.abstract ? ' (abstract)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

function effectiveStoredAttributes(
  project: ProjectDto,
  classId: string,
  visited = new Set<string>(),
): ProjectDto['umlModel']['classes'][number]['attributes'] {
  if (visited.has(classId)) return [];
  visited.add(classId);
  const umlClass = project.umlModel.classes.find((item) => item.id === classId);
  if (!umlClass) return [];
  return [
    ...(umlClass.superClassIds ?? []).flatMap((id) =>
      effectiveStoredAttributes(project, id, visited),
    ),
    ...umlClass.attributes,
  ].filter((attribute) => !attribute.staticAttribute && !attribute.derived);
}

function isObjectDiagramModal(modal: Exclude<ModalState, null>): modal is ObjectDiagramModalState {
  return modal.type === 'addObject' || modal.type === 'addObjectAssociation';
}
