import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { ApiClientError, objectModelApi } from '../../../api';
import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions, type ModalState } from '../../../state';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { addObject, appendObjectLink } from '../objectDiagramUpdates';

interface ObjectDiagramModalsProps {
  modal: Exclude<ModalState, null>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}

type ObjectDiagramModalState = Extract<
  Exclude<ModalState, null>,
  { type: 'addObject' | 'addObjectAssociation' }
>;

export function ObjectDiagramModals({
  modal,
  project,
  onProjectChange,
}: ObjectDiagramModalsProps) {
  if (!isObjectDiagramModal(modal)) {
    return null;
  }

  if (modal.type === 'addObject') {
    return (
      <AddObjectModal
        modal={modal}
        project={project}
        onProjectChange={onProjectChange}
      />
    );
  }

  return (
    <AddObjectAssociationModal
      modal={modal}
      project={project}
      onProjectChange={onProjectChange}
    />
  );
}

function AddObjectModal({
  modal,
  project,
  onProjectChange,
}: {
  modal: Extract<ObjectDiagramModalState, { type: 'addObject' }>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const classes = project.umlModel.classes;
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(modal.classId ?? classes[0]?.id ?? '');
  const [submitted, setSubmitted] = useState(false);
  const trimmedName = name.trim();
  const hasDuplicateName = project.objectModel.objects.some(
    (object) => object.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  );
  const canSubmit =
    classes.length > 0 && trimmedName.length > 0 && classId.length > 0 && !hasDuplicateName;

  return (
    <ModalShell
      title="Add Object"
      submitLabel="Create Object"
      canSubmit={canSubmit}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit) {
          return;
        }

        const result = addObject(project, {
          name,
          classId,
        });
        syncProjectChange({
          projectId: project.project.id,
          nextProject: result.project,
          onProjectChange,
          successMessage: `Object "${trimmedName}" saved.`,
        });
        appStoreActions.select({
          view: 'object-diagram',
          type: 'object',
          id: result.createdId,
        });
        appStoreActions.closeModal();
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
        onChange={setClassId}
      />
    </ModalShell>
  );
}

function AddObjectAssociationModal({
  modal,
  project,
  onProjectChange,
}: {
  modal: Extract<ObjectDiagramModalState, { type: 'addObjectAssociation' }>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const associations = project.umlModel.associations;
  const [associationId, setAssociationId] = useState(
    modal.associationId ?? associations[0]?.id ?? '',
  );
  const association = associations.find((candidate) => candidate.id === associationId);
  const [sourceEnd, targetEnd] = association?.ends ?? [];
  const sourceObjects = useMemo(
    () =>
      sourceEnd
        ? project.objectModel.objects.filter((object) => object.classId === sourceEnd.classId)
        : [],
    [project.objectModel.objects, sourceEnd],
  );
  const targetObjects = useMemo(
    () =>
      targetEnd
        ? project.objectModel.objects.filter((object) => object.classId === targetEnd.classId)
        : [],
    [project.objectModel.objects, targetEnd],
  );
  const [sourceObjectId, setSourceObjectId] = useState(
    modal.sourceObjectId ?? sourceObjects[0]?.id ?? '',
  );
  const [targetObjectId, setTargetObjectId] = useState(
    modal.targetObjectId ?? targetObjects[0]?.id ?? '',
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sourceObjectIsValid = sourceObjects.some((object) => object.id === sourceObjectId);
  const targetObjectIsValid = targetObjects.some((object) => object.id === targetObjectId);
  const canSubmit =
    Boolean(association) &&
    sourceObjectId.length > 0 &&
    targetObjectId.length > 0 &&
    sourceObjectIsValid &&
    targetObjectIsValid;

  return (
    <ModalShell
      title="Add Object Association"
      submitLabel={isSaving ? 'Creating...' : 'Create Association'}
      canSubmit={canSubmit && !isSaving}
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitted(true);
        setSaveError(null);

        if (!canSubmit) {
          return;
        }

        setIsSaving(true);

        try {
          const createdLink = await objectModelApi.createObjectLink(project.project.id, {
            associationId,
            endValues:
              sourceEnd && targetEnd
                ? [
                    { associationEndId: sourceEnd.id, objectId: sourceObjectId },
                    { associationEndId: targetEnd.id, objectId: targetObjectId },
                  ]
                : [],
          });
          onProjectChange(appendObjectLink(project, createdLink));
          appStoreActions.markValidationStale();
          appStoreActions.addConsoleLog({
            level: 'info',
            source: 'api',
            message: 'Object link saved.',
          });
          appStoreActions.select({
            view: 'object-diagram',
            type: 'objectLink',
            id: createdLink.id,
          });
          appStoreActions.closeModal();
        } catch (error) {
          setSaveError(formatModalError(error));
        } finally {
          setIsSaving(false);
        }
      }}
    >
      {associations.length === 0 ? (
        <p className="modal-form-error">
          Create a class association before linking objects.
        </p>
      ) : null}
      <ModalAssociationSelect
        associations={associations}
        value={associationId}
        onChange={(value) => {
          setAssociationId(value);
          const nextAssociation = associations.find((candidate) => candidate.id === value);
          const [nextSourceEnd, nextTargetEnd] = nextAssociation?.ends ?? [];
          setSourceObjectId(
            modal.sourceObjectId &&
              nextSourceEnd &&
              project.objectModel.objects.some(
                (object) =>
                  object.id === modal.sourceObjectId &&
                  object.classId === nextSourceEnd.classId,
              )
              ? modal.sourceObjectId
              : nextSourceEnd
              ? project.objectModel.objects.find(
                  (object) => object.classId === nextSourceEnd.classId,
                )?.id ?? ''
              : '',
          );
          setTargetObjectId(
            modal.targetObjectId &&
              nextTargetEnd &&
              project.objectModel.objects.some(
                (object) =>
                  object.id === modal.targetObjectId &&
                  object.classId === nextTargetEnd.classId,
              )
              ? modal.targetObjectId
              : nextTargetEnd
              ? project.objectModel.objects.find(
                  (object) => object.classId === nextTargetEnd.classId,
                )?.id ?? ''
              : '',
          );
        }}
      />
      <div className="modal-row-grid">
        <ModalObjectSelect
          label="Source Object"
          objects={sourceObjects}
          value={sourceObjectId}
          error={submitted && !sourceObjectIsValid ? 'Select a matching object.' : null}
          onChange={setSourceObjectId}
        />
        <ModalObjectSelect
          label="Target Object"
          objects={targetObjects}
          value={targetObjectId}
          error={submitted && !targetObjectIsValid ? 'Select a matching object.' : null}
          onChange={setTargetObjectId}
        />
      </div>
      {saveError ? <p className="modal-form-error">{saveError}</p> : null}
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

function ModalShell({
  title,
  submitLabel,
  canSubmit,
  children,
  onSubmit,
}: ModalShellProps) {
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
          <option key={umlClass.id} value={umlClass.id}>
            {umlClass.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalAssociationSelect({
  associations,
  value,
  onChange,
}: {
  associations: ProjectDto['umlModel']['associations'];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="modal-field">
      <span>Association</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {associations.map((association) => (
          <option key={association.id} value={association.id}>
            {association.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalObjectSelect({
  label,
  objects,
  value,
  error,
  onChange,
}: {
  label: string;
  objects: ProjectDto['objectModel']['objects'];
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      <select
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select object</option>
        {objects.map((object) => (
          <option key={object.id} value={object.id}>
            {object.name}
          </option>
        ))}
      </select>
      {error ? <small className="property-field-error">{error}</small> : null}
    </label>
  );
}

function isObjectDiagramModal(
  modal: Exclude<ModalState, null>,
): modal is ObjectDiagramModalState {
  return modal.type === 'addObject' || modal.type === 'addObjectAssociation';
}

function formatModalError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto?.userMessage ?? error.dto?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Object link could not be created.';
}
