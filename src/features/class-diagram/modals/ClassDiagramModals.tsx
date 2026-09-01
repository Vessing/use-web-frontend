import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto, UmlTypeDto } from '../../../api/dtos';
import { appStoreActions, type ModalState } from '../../../state';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { parseMultiplicity } from '../properties/multiplicity';
import { addClass } from '../properties/projectUpdates';
import { NaryAssociationModal } from './NaryAssociationModal';
import { ModelTypeModal } from './ModelTypeModal';
import { ModelTypeDeleteDialog } from './ModelTypeDeleteDialog';

interface ClassDiagramModalsProps {
  modal: Exclude<ModalState, null>;
  project: ProjectDto;
  expectedRevision: string;
  onProjectChange: (project: ProjectDto) => void;
  onRefreshProject: () => Promise<boolean>;
}

type ClassDiagramModalState = Extract<
  Exclude<ModalState, null>,
  { type: 'addClass' | 'addClassAssociation' | 'addInvariant' | 'addPackage' | 'addImport' | 'addEnumeration' | 'addDataType' }
>;

const primitiveTypes: UmlTypeDto[] = ['String', 'Integer', 'Real', 'Boolean'];

export function ClassDiagramModals({
  modal,
  project,
  expectedRevision,
  onProjectChange,
  onRefreshProject,
}: ClassDiagramModalsProps) {
  if (modal.type === 'deleteModelTypeElement') {
    return (
      <ModelTypeDeleteDialog
        modal={modal}
        project={project}
        fallbackRevision={expectedRevision}
        onRefreshProject={onRefreshProject}
      />
    );
  }

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
      <NaryAssociationModal
        modal={modal}
        project={project}
        expectedRevision={expectedRevision}
        onRefreshProject={onRefreshProject}
      />
    );
  }

  if (modal.type === 'addPackage') {
    return (
      <AddPackageModal
        project={project}
        expectedRevision={expectedRevision}
        onRefreshProject={onRefreshProject}
      />
    );
  }

  if (modal.type === 'addImport') {
    return (
      <AddImportModal
        project={project}
        expectedRevision={expectedRevision}
        onRefreshProject={onRefreshProject}
      />
    );
  }

  if (modal.type === 'addEnumeration' || modal.type === 'addDataType') {
    return <ModelTypeModal kind={modal.type === 'addEnumeration' ? 'enumeration' : 'dataType'} project={project} expectedRevision={expectedRevision} onRefreshProject={onRefreshProject} />;
  }

  return (
    <AddInvariantModal
      modal={modal}
      project={project}
      expectedRevision={expectedRevision}
      onRefreshProject={onRefreshProject}
    />
  );
}

function AddPackageModal({ project, expectedRevision, onRefreshProject }: { project: ProjectDto; expectedRevision: string; onRefreshProject: () => Promise<boolean> }) {
  const packages = project.umlModel.packages ?? [];
  const [name, setName] = useState('');
  const [parentPackageId, setParentPackageId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const canSubmit = name.trim().length > 0 && Boolean(expectedRevision) && !busy;
  return (
    <ModalShell title="Create Package" submitLabel={busy ? 'Creating...' : 'Create Package'} canSubmit={canSubmit} onSubmit={(event) => {
      event.preventDefault();
      if (!canSubmit) return;
      setError(null); setFieldErrors({}); setBusy(true);
      const parent = packages.find((candidate) => candidate.id === parentPackageId);
      const qualifiedName = parent ? `${parent.qualifiedName}::${name.trim()}` : name.trim();
      const draft = { id: `package-${crypto.randomUUID()}`, qualifiedName };
      void modelCommandApi.createPackage(project.project.id, { expectedRevision, draft }).then(async (result) => {
        if (!await onRefreshProject()) throw new Error('The authoritative project projection could not be reloaded.');
        appStoreActions.select({ view: 'class-diagram', type: 'package', id: result.result.id });
        appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Package ${result.result.qualifiedName} created at model revision ${result.revision}.` });
        appStoreActions.closeModal();
      }).catch((caught) => {
        setError(commandMessage(caught)); setFieldErrors(commandFieldErrors(caught)); setBusy(false);
      });
    }}>
      <ModalTextField label="Package name" value={name} autoFocus onChange={setName} error={fieldErrors.name ?? fieldErrors.qualifiedName} />
      <ModalPackageSelect label="Parent package" packages={packages} value={parentPackageId} onChange={setParentPackageId} includeRoot error={fieldErrors.parentPackageId} />
      <p className="modal-hint">The backend validates the resulting namespace and package hierarchy.</p>
      {!expectedRevision ? <p className="modal-form-error">The model revision is not available.</p> : null}
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
    </ModalShell>
  );
}

function AddImportModal({ project, expectedRevision, onRefreshProject }: { project: ProjectDto; expectedRevision: string; onRefreshProject: () => Promise<boolean> }) {
  const packages = project.umlModel.packages ?? [];
  const [importingPackageId, setImportingPackageId] = useState(packages[0]?.id ?? '');
  const [importedPackageId, setImportedPackageId] = useState(packages[1]?.id ?? packages[0]?.id ?? '');
  const [alias, setAlias] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const canSubmit = packages.length >= 2 && Boolean(importingPackageId) && Boolean(importedPackageId) && Boolean(expectedRevision) && !busy;
  return (
    <ModalShell title="Add Package Import" submitLabel={busy ? 'Adding...' : 'Add Import'} canSubmit={canSubmit} onSubmit={(event) => {
      event.preventDefault();
      if (!canSubmit) return;
      setError(null); setFieldErrors({}); setBusy(true);
      const draft = { id: `import-${crypto.randomUUID()}`, importingPackageId, importedPackageId, alias: alias.trim() || null, source: source.trim() || null, provenance: 'WORKSPACE' };
      void modelCommandApi.createImport(project.project.id, { expectedRevision, draft }).then(async (result) => {
        if (!await onRefreshProject()) throw new Error('The authoritative project projection could not be reloaded.');
        appStoreActions.select({ view: 'class-diagram', type: 'import', id: result.result.id });
        appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Import ${result.result.alias || result.result.id} added at model revision ${result.revision}.` });
        appStoreActions.closeModal();
      }).catch((caught) => {
        setError(commandMessage(caught)); setFieldErrors(commandFieldErrors(caught)); setBusy(false);
      });
    }}>
      {packages.length < 2 ? <p className="modal-form-error">At least two packages are required.</p> : null}
      <ModalPackageSelect label="Target package" packages={packages} value={importingPackageId} onChange={setImportingPackageId} error={fieldErrors.importingPackageId} />
      <ModalPackageSelect label="Imported package" packages={packages} value={importedPackageId} onChange={setImportedPackageId} error={fieldErrors.importedPackageId} />
      <ModalTextField label="Alias (optional)" value={alias} onChange={setAlias} error={fieldErrors.alias} />
      <ModalTextField label="Source (optional)" value={source} onChange={setSource} error={fieldErrors.source} />
      <p className="modal-hint">Cycles, aliases and namespace resolution are validated by the backend.</p>
      {!expectedRevision ? <p className="modal-form-error">The model revision is not available.</p> : null}
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
    </ModalShell>
  );
}

function ModalPackageSelect({ label, packages, value, onChange, includeRoot = false, error }: { label: string; packages: NonNullable<ProjectDto['umlModel']['packages']>; value: string; onChange: (value: string) => void; includeRoot?: boolean; error?: string }) {
  return <label className="modal-field"><span>{label}</span><select value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)}>{includeRoot ? <option value="">Project root</option> : null}{packages.map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}</select>{error ? <small className="property-field-error">{error}</small> : null}</label>;
}

function commandMessage(error: unknown) {
  return error instanceof ApiClientError ? `${error.dto.userMessage ?? error.message} (${error.dto.code})` : 'The change could not be applied.';
}

function commandFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError)) return {};
  if (error.dto.fieldErrors) return error.dto.fieldErrors;
  if (error.dto.code === 'PACKAGE_CYCLE') return { parentPackageId: error.dto.userMessage ?? error.message };
  if (error.dto.code === 'INVALID_PACKAGE' || error.dto.code === 'DUPLICATE_NAMESPACE') return { qualifiedName: error.dto.userMessage ?? error.message };
  if (error.dto.code === 'IMPORT_CYCLE') return { importedPackageId: error.dto.userMessage ?? error.message };
  return {};
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
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'PACKAGE'>('PUBLIC');
  const [packageId, setPackageId] = useState('');
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
          visibility,
          packageId: packageId || null,
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
      <label className="modal-field"><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="PUBLIC">+ public</option><option value="PRIVATE">- private</option><option value="PROTECTED"># protected</option><option value="PACKAGE">~ package</option></select></label>
      <ModalPackageSelect label="Package / Namespace" packages={project.umlModel.packages ?? []} value={packageId} onChange={setPackageId} includeRoot />

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

// Kept as the binary draft implementation until its remaining callers migrate to the command modal.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AddAssociationModal({
  modal,
  project,
  expectedRevision,
  onRefreshProject,
}: {
  modal: Extract<ClassDiagramModalState, { type: 'addClassAssociation' }>;
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
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
  const [isSaving, setIsSaving] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
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
      canSubmit={canSubmit && !isSaving && Boolean(expectedRevision)}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit || !parsedSourceMultiplicity || !parsedTargetMultiplicity) {
          return;
        }

        const associationId = `association-${crypto.randomUUID()}`;
        const draft = {
          id: associationId,
          name: name.trim(),
          associationClassId: null,
          ends: [
            createEnd(sourceClassId, sourceRoleName, parsedSourceMultiplicity),
            createEnd(targetClassId, targetRoleName, parsedTargetMultiplicity),
          ],
        };
        setIsSaving(true);
        setCommandError(null);
        void modelCommandApi.createAssociation(project.project.id, {
          expectedRevision,
          draft,
        }).then(async () => {
          await onRefreshProject();
          appStoreActions.select({ view: 'class-diagram', type: 'association', id: associationId });
          appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Association "${draft.name}" created.` });
          appStoreActions.closeModal();
        }).catch((error) => setCommandError(commandMessage(error))).finally(() => setIsSaving(false));
      }}
    >
      {classes.length < 2 ? (
        <p className="modal-form-error">
          At least two classes are required to create an association.
        </p>
      ) : null}
      {!expectedRevision ? <p className="modal-form-error">The model revision is not available.</p> : null}
      {commandError ? <p className="modal-form-error" role="alert">{commandError}</p> : null}
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

function createEnd(
  classId: string,
  roleName: string,
  multiplicity: NonNullable<ReturnType<typeof parseMultiplicity>>,
) {
  return {
    id: `association-end-${crypto.randomUUID()}`,
    classId,
    roleName: roleName.trim(),
    multiplicity,
    navigable: true,
    ordered: false,
    unique: true,
    derived: false,
    union: false,
    subsettedEndIds: [],
    redefinedEndIds: [],
    navigationType: null,
    qualifiers: [],
    aggregationKind: 'NONE' as const,
  };
}

function AddInvariantModal({
  modal,
  project,
  expectedRevision,
  onRefreshProject,
}: {
  modal: Extract<ClassDiagramModalState, { type: 'addInvariant' }>;
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}) {
  const classes = project.umlModel.classes;
  const [name, setName] = useState('');
  const [contextClassId, setContextClassId] = useState(
    modal.contextClassId ?? classes[0]?.id ?? '',
  );
  const [expression, setExpression] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const canSubmit =
    !busy &&
    Boolean(expectedRevision) &&
    classes.length > 0 &&
    name.trim().length > 0 &&
    contextClassId.length > 0 &&
    expression.trim().length > 0;

  return (
    <ModalShell
      title="Add Invariant"
      submitLabel="Create Invariant"
      canSubmit={canSubmit}
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitted(true);

        if (!canSubmit) {
          return;
        }

        setBusy(true);
        setError(null);
        setFieldErrors({});
        try {
          const result = await modelCommandApi.createInvariant(project.project.id, {
            expectedRevision,
            draft: {
              id: `invariant-${crypto.randomUUID()}`,
              name: name.trim(),
              contextClassId,
              expression: expression.trim(),
              enabled: true,
              description: '',
            },
          });
          if (!(await onRefreshProject())) {
            throw new Error('The authoritative invariant projection could not be reloaded.');
          }
          appStoreActions.select({ view: 'class-diagram', type: 'invariant', id: result.result.id });
          appStoreActions.markValidationStale();
          appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Invariant "${result.result.name}" created at model revision ${result.revision}.` });
          appStoreActions.closeModal();
        } catch (cause) {
          if (cause instanceof ApiClientError) setFieldErrors(cause.dto.fieldErrors ?? {});
          setError(cause instanceof Error ? commandMessage(cause) : 'The invariant could not be created.');
        } finally {
          setBusy(false);
        }
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
      {fieldErrors.contextClassId ? <small className="property-field-error" role="alert">{fieldErrors.contextClassId}</small> : null}
      <ModalTextField
        label="Invariant Name"
        value={name}
        autoFocus
        error={submitted && !name.trim() ? 'Invariant name is required.' : fieldErrors.name ?? null}
        onChange={setName}
      />
      <label className="modal-field">
        <span>OCL Expression</span>
        <textarea
          aria-label="OCL Expression"
          value={expression}
          rows={5}
          aria-invalid={submitted && !expression.trim() ? true : undefined}
          placeholder="self.books <= 5"
          onChange={(event) => setExpression(event.target.value)}
        />
        {submitted && !expression.trim() ? (
          <small className="property-field-error">Enter an OCL expression.</small>
        ) : fieldErrors.expression ? <small className="property-field-error" role="alert">{fieldErrors.expression}</small> : null}
      </label>
      {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
      {busy ? <p role="status">Creating invariant...</p> : null}
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
    modal.type === 'addInvariant' ||
    modal.type === 'addPackage' ||
    modal.type === 'addImport' ||
    modal.type === 'addEnumeration' ||
    modal.type === 'addDataType'
  );
}
