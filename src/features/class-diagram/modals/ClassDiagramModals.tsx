import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import type { ProjectDto, UmlTypeDto } from '../../../api/dtos';
import { appStoreActions, type ModalState } from '../../../state';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { parseMultiplicity } from '../properties/multiplicity';
import {
  addAssociation,
  addClass,
  addInvariant,
} from '../properties/projectUpdates';

interface ClassDiagramModalsProps {
  modal: Exclude<ModalState, null>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}

type ClassDiagramModalState = Extract<
  Exclude<ModalState, null>,
  { type: 'addClass' | 'addClassAssociation' | 'addInvariant' }
>;

const primitiveTypes: UmlTypeDto[] = ['String', 'Integer', 'Real', 'Boolean'];

export function ClassDiagramModals({
  modal,
  project,
  onProjectChange,
}: ClassDiagramModalsProps) {
  if (!isClassDiagramModal(modal)) {
    return null;
  }

  if (modal.type === 'addClass') {
    return (
      <AddClassModal
        modal={modal}
        project={project}
        onProjectChange={onProjectChange}
      />
    );
  }

  if (modal.type === 'addClassAssociation') {
    return (
      <AddAssociationModal
        modal={modal}
        project={project}
        onProjectChange={onProjectChange}
      />
    );
  }

  return (
    <AddInvariantModal
      modal={modal}
      project={project}
      onProjectChange={onProjectChange}
    />
  );
}

function AddClassModal({
  modal,
  project,
  onProjectChange,
}: {
  modal: Extract<ClassDiagramModalState, { type: 'addClass' }>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Array<{ name: string; type: UmlTypeDto }>>([]);
  const [operations, setOperations] = useState<
    Array<{ name: string; returnType: UmlTypeDto }>
  >([]);
  const [submitted, setSubmitted] = useState(false);
  const trimmedName = name.trim();
  const hasDuplicateName = project.umlModel.classes.some(
    (umlClass) => umlClass.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  );
  const hasInvalidAttributes = attributes.some((attribute) => !attribute.name.trim());
  const hasInvalidOperations = operations.some((operation) => !operation.name.trim());
  const canSubmit =
    trimmedName.length > 0 && !hasDuplicateName && !hasInvalidAttributes && !hasInvalidOperations;

  return (
    <ModalShell
      title="Add New Class"
      submitLabel="Create Class"
      canSubmit={canSubmit}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit) {
          return;
        }

        const result = addClass(project, {
          name,
          attributes: attributes.filter((attribute) => attribute.name.trim()),
          operations: operations.filter((operation) => operation.name.trim()),
          position: modal.initialPosition,
        });
        syncProjectChange({
          projectId: project.project.id,
          nextProject: result.project,
          onProjectChange,
          successMessage: `Class "${trimmedName}" saved.`,
        });
        appStoreActions.select({
          view: 'class-diagram',
          type: 'class',
          id: result.createdId,
        });
        appStoreActions.closeModal();
      }}
    >
      <ModalTextField
        label="Class Name"
        value={name}
        autoFocus
        error={submitted && !trimmedName ? 'Class name is required.' : null}
        onChange={setName}
      />
      {submitted && hasDuplicateName ? (
        <p className="modal-form-error">Class name must be unique.</p>
      ) : null}

      <ModalSection
        title="Initial Attributes"
        actionLabel="Add Attribute"
        onAction={() => setAttributes((current) => [...current, { name: '', type: 'String' }])}
      >
        {attributes.length === 0 ? (
          <p className="modal-empty">No initial attributes.</p>
        ) : (
          attributes.map((attribute, index) => (
            <div key={index} className="modal-row-grid">
              <ModalTextField
                label="Name"
                value={attribute.name}
                error={submitted && !attribute.name.trim() ? 'Required' : null}
                onChange={(value) =>
                  setAttributes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: value } : item,
                    ),
                  )
                }
              />
              <ModalTypeSelect
                label="Type"
                value={attribute.type}
                onChange={(type) =>
                  setAttributes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, type } : item,
                    ),
                  )
                }
              />
            </div>
          ))
        )}
      </ModalSection>

      <ModalSection
        title="Initial Operations"
        actionLabel="Add Operation"
        onAction={() =>
          setOperations((current) => [...current, { name: '', returnType: 'Boolean' }])
        }
      >
        {operations.length === 0 ? (
          <p className="modal-empty">No initial operations.</p>
        ) : (
          operations.map((operation, index) => (
            <div key={index} className="modal-row-grid">
              <ModalTextField
                label="Name"
                value={operation.name}
                error={submitted && !operation.name.trim() ? 'Required' : null}
                onChange={(value) =>
                  setOperations((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: value } : item,
                    ),
                  )
                }
              />
              <ModalTypeSelect
                label="Return"
                value={operation.returnType}
                onChange={(returnType) =>
                  setOperations((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, returnType } : item,
                    ),
                  )
                }
              />
            </div>
          ))
        )}
      </ModalSection>
    </ModalShell>
  );
}

function AddAssociationModal({
  modal,
  project,
  onProjectChange,
}: {
  modal: Extract<ClassDiagramModalState, { type: 'addClassAssociation' }>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const classes = project.umlModel.classes;
  const firstClassId = classes[0]?.id ?? '';
  const secondClassId = classes[1]?.id ?? firstClassId;
  const [name, setName] = useState('');
  const [sourceClassId, setSourceClassId] = useState(modal.sourceClassId ?? firstClassId);
  const [targetClassId, setTargetClassId] = useState(modal.targetClassId ?? secondClassId);
  const [sourceRoleName, setSourceRoleName] = useState('');
  const [targetRoleName, setTargetRoleName] = useState('');
  const [sourceMultiplicity, setSourceMultiplicity] = useState('1');
  const [targetMultiplicity, setTargetMultiplicity] = useState('0..*');
  const [submitted, setSubmitted] = useState(false);
  const parsedSourceMultiplicity = parseMultiplicity(sourceMultiplicity);
  const parsedTargetMultiplicity = parseMultiplicity(targetMultiplicity);
  const canSubmit =
    classes.length >= 2 &&
    name.trim().length > 0 &&
    sourceClassId.length > 0 &&
    targetClassId.length > 0 &&
    sourceRoleName.trim().length > 0 &&
    targetRoleName.trim().length > 0 &&
    Boolean(parsedSourceMultiplicity) &&
    Boolean(parsedTargetMultiplicity);

  return (
    <ModalShell
      title="Add Association"
      submitLabel="Create Association"
      canSubmit={canSubmit}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit || !parsedSourceMultiplicity || !parsedTargetMultiplicity) {
          return;
        }

        const result = addAssociation(project, {
          name,
          sourceClassId,
          sourceRoleName,
          sourceMultiplicity: parsedSourceMultiplicity,
          targetClassId,
          targetRoleName,
          targetMultiplicity: parsedTargetMultiplicity,
        });
        syncProjectChange({
          projectId: project.project.id,
          nextProject: result.project,
          onProjectChange,
          successMessage: `Association "${name.trim()}" saved.`,
        });
        appStoreActions.select({
          view: 'class-diagram',
          type: 'association',
          id: result.createdId,
        });
        appStoreActions.closeModal();
      }}
    >
      {classes.length < 2 ? (
        <p className="modal-form-error">
          At least two classes are required to create an association.
        </p>
      ) : null}
      <ModalTextField
        label="Association Name"
        value={name}
        autoFocus
        error={submitted && !name.trim() ? 'Association name is required.' : null}
        onChange={setName}
      />
      <div className="modal-row-grid">
        <ModalClassSelect
          label="Source Class"
          classes={classes}
          value={sourceClassId}
          onChange={setSourceClassId}
        />
        <ModalClassSelect
          label="Target Class"
          classes={classes}
          value={targetClassId}
          onChange={setTargetClassId}
        />
      </div>
      <ModalSection title="Source End">
        <div className="modal-row-grid">
          <ModalTextField
            label="Source Role"
            value={sourceRoleName}
            error={submitted && !sourceRoleName.trim() ? 'Required' : null}
            onChange={setSourceRoleName}
          />
          <ModalTextField
            label="Multiplicity"
            value={sourceMultiplicity}
            error={
              submitted && !parsedSourceMultiplicity
                ? 'Use 1, 0..1, 0..* or 1..*.'
                : null
            }
            onChange={setSourceMultiplicity}
          />
        </div>
      </ModalSection>
      <ModalSection title="Target End">
        <div className="modal-row-grid">
          <ModalTextField
            label="Target Role"
            value={targetRoleName}
            error={submitted && !targetRoleName.trim() ? 'Required' : null}
            onChange={setTargetRoleName}
          />
          <ModalTextField
            label="Multiplicity"
            value={targetMultiplicity}
            error={
              submitted && !parsedTargetMultiplicity
                ? 'Use 1, 0..1, 0..* or 1..*.'
                : null
            }
            onChange={setTargetMultiplicity}
          />
        </div>
      </ModalSection>
    </ModalShell>
  );
}

function AddInvariantModal({
  modal,
  project,
  onProjectChange,
}: {
  modal: Extract<ClassDiagramModalState, { type: 'addInvariant' }>;
  project: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const classes = project.umlModel.classes;
  const [name, setName] = useState('');
  const [contextClassId, setContextClassId] = useState(
    modal.contextClassId ?? classes[0]?.id ?? '',
  );
  const [expression, setExpression] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const canSubmit =
    classes.length > 0 &&
    name.trim().length > 0 &&
    contextClassId.length > 0 &&
    expression.trim().length > 0;

  return (
    <ModalShell
      title="Add Invariant"
      submitLabel="Create Invariant"
      canSubmit={canSubmit}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit) {
          return;
        }

        const result = addInvariant(project, {
          name,
          contextClassId,
          expression,
        });
        syncProjectChange({
          projectId: project.project.id,
          nextProject: result.project,
          onProjectChange,
          successMessage: `Invariant "${name.trim()}" saved.`,
        });
        appStoreActions.select({
          view: 'class-diagram',
          type: 'invariant',
          id: result.createdId,
        });
        appStoreActions.closeModal();
      }}
    >
      {classes.length === 0 ? (
        <p className="modal-form-error">Create a class before adding an invariant.</p>
      ) : null}
      <ModalClassSelect
        label="Context Class"
        classes={classes}
        value={contextClassId}
        onChange={setContextClassId}
      />
      <ModalTextField
        label="Invariant Name"
        value={name}
        autoFocus
        error={submitted && !name.trim() ? 'Invariant name is required.' : null}
        onChange={setName}
      />
      <label className="modal-field">
        <span>OCL Expression</span>
        <textarea
          value={expression}
          rows={5}
          aria-invalid={submitted && !expression.trim() ? true : undefined}
          placeholder="self.books <= 5"
          onChange={(event) => setExpression(event.target.value)}
        />
        {submitted && !expression.trim() ? (
          <small className="property-field-error">Enter an OCL expression.</small>
        ) : null}
      </label>
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
        aria-labelledby="modal-title"
        onSubmit={onSubmit}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
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

interface ModalTextFieldProps {
  label: string;
  value: string;
  autoFocus?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}

function ModalTextField({
  label,
  value,
  autoFocus = false,
  error,
  onChange,
}: ModalTextFieldProps) {
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

function ModalTypeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: UmlTypeDto;
  onChange: (value: UmlTypeDto) => void;
}) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {primitiveTypes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
  const options = useMemo(() => classes.map((umlClass) => umlClass), [classes]);

  return (
    <label className="modal-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((umlClass) => (
          <option key={umlClass.id} value={umlClass.id}>
            {umlClass.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalSection({
  title,
  actionLabel,
  children,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
}) {
  return (
    <section className="modal-section">
      <div className="modal-section-header">
        <h3>{title}</h3>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function isClassDiagramModal(modal: Exclude<ModalState, null>): modal is ClassDiagramModalState {
  return (
    modal.type === 'addClass' ||
    modal.type === 'addClassAssociation' ||
    modal.type === 'addInvariant'
  );
}
