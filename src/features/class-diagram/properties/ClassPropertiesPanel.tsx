import { useMemo, useState, type ReactNode } from 'react';

import { ApiClientError } from '../../../api/client/apiError';
import { modelCommandApi, umlApi } from '../../../api';
import type {
  ClassProjectionDto,
  ProjectDto,
  ProjectReadModelDto,
  UmlAssociationDto,
  UmlClassDto,
  UmlInvariantDto,
  UmlVisibilityDto,
} from '../../../api/dtos';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { appStoreActions } from '../../../state';
import { formatMultiplicity } from '../../diagram-core';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { updateClass } from './projectUpdates';
import { AttributePropertiesSection } from './AttributePropertiesSection';
import { DefinitionPropertiesSection } from './DefinitionPropertiesSection';
import { OperationPropertiesSection } from './OperationPropertiesSection';

interface ClassPropertiesPanelProps {
  project: ProjectDto;
  umlClass: UmlClassDto;
  onProjectChange: (project: ProjectDto) => void;
  readModel?: ProjectReadModelDto | null;
  onRefreshProject?: () => Promise<boolean>;
}

export function ClassPropertiesPanel({
  project,
  umlClass,
  onProjectChange,
  readModel,
  onRefreshProject = async () => true,
}: ClassPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'class' | 'associations' | 'invariants'>('class');
  const nameError = umlClass.name.trim() ? null : 'Class name is required.';
  const relatedAssociations = useMemo(
    () =>
      project.umlModel.associations.filter((association) =>
        association.ends.some((end) => end.classId === umlClass.id),
      ),
    [project.umlModel.associations, umlClass.id],
  );
  const relatedInvariants = useMemo(
    () =>
      project.umlModel.invariants.filter(
        (invariant) => invariant.contextClassId === umlClass.id,
      ),
    [project.umlModel.invariants, umlClass.id],
  );

  return (
    <div className="properties-content">
      <h3>Class Properties</h3>

      <div className="properties-segmented-control" role="tablist" aria-label="Class properties">
        <button
          type="button"
          className={activeTab === 'class' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'class'}
          onClick={() => setActiveTab('class')}
        >
          Class
        </button>
        <button
          type="button"
          className={activeTab === 'associations' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'associations'}
          onClick={() => setActiveTab('associations')}
        >
          Association
        </button>
        <button
          type="button"
          className={activeTab === 'invariants' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'invariants'}
          onClick={() => setActiveTab('invariants')}
        >
          Invariant
        </button>
      </div>

      {activeTab === 'class' ? (
        <ClassGeneralProperties
          project={project}
          umlClass={umlClass}
          nameError={nameError}
          readModel={readModel}
          onRefreshProject={onRefreshProject}
          onProjectChange={onProjectChange}
        />
      ) : null}

      {activeTab === 'associations' ? (
        <ClassAssociationAccess
          project={project}
          umlClass={umlClass}
          associations={relatedAssociations}
        />
      ) : null}

      {activeTab === 'invariants' ? (
        <ClassInvariantAccess
          umlClass={umlClass}
          invariants={relatedInvariants}
        />
      ) : null}
    </div>
  );
}

function ClassGeneralProperties({
  project,
  umlClass,
  nameError,
  onProjectChange,
  readModel,
  onRefreshProject = async () => true,
}: ClassPropertiesPanelProps & { nameError: string | null }) {
  const projection = readModel?.classes.find((candidate) => candidate.id === umlClass.id);
  return (
    <>
      <PropertyTextField label="Class ID" value={umlClass.id} readOnly />
      <PropertyTextField
        label="Class Name"
        value={umlClass.name}
        error={nameError}
        onChange={(name) => {
          onProjectChange(updateClass(project, umlClass.id, (current) => ({ ...current, name })));
          appStoreActions.markValidationStale();
        }}
        onCommit={(name) =>
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateClass(project, umlClass.id, (current) => ({ ...current, name })),
            onProjectChange,
            successMessage: `Class "${name}" saved.`,
          })
        }
      />
      <PropertyTextField
        label="Qualified Name"
        value={projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name}
        readOnly
      />
      <VisibilitySelect
        label="Class Visibility"
        value={umlClass.visibility ?? 'PUBLIC'}
        onChange={(visibility) =>
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateClass(project, umlClass.id, (current) => ({ ...current, visibility })),
            onProjectChange,
            successMessage: `Visibility of "${umlClass.name}" saved.`,
          })
        }
      />
      <label className="property-field">
        <span>Package / Namespace</span>
        <select
          value={umlClass.packageId ?? ''}
          onChange={(event) => {
            const packageId = event.target.value || null;
            void syncProjectChange({
              projectId: project.project.id,
              nextProject: updateClass(project, umlClass.id, (current) => ({ ...current, packageId })),
              onProjectChange,
              successMessage: `Namespace of "${umlClass.name}" saved.`,
            });
          }}
        >
          <option value="">Project root</option>
          {(project.umlModel.packages ?? []).map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}
        </select>
      </label>
      <DeleteActionButton
        label="Delete Class"
        confirmMessage={`Delete class "${umlClass.name}"? Dependent associations, invariants, objects, links, layout entries and validation markers may be removed by the backend.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => umlApi.deleteClass(project.project.id, umlClass.id),
            onProjectChange,
            successMessage: `Class "${umlClass.name}" deleted.`,
          }).then(() => undefined)
        }
      />

      <PropertySection
        title="Attributes"
      >
        <AttributePropertiesSection project={project} umlClass={umlClass} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} />
      </PropertySection>

      <PropertySection
        title="Operations"
      >
        <OperationPropertiesSection
          project={project}
          umlClass={umlClass}
          revision={readModel?.readVersion ?? ''}
          onRefreshProject={onRefreshProject}
        />
      </PropertySection>

      <GeneralizationsSection
        project={project}
        umlClass={umlClass}
        projection={projection}
        revision={readModel?.readVersion}
        onRefreshProject={onRefreshProject}
      />

      <PropertySection title="Definitions">
        <DefinitionPropertiesSection project={project} ownerKind="CLASS" ownerId={umlClass.id} ownerName={projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} />
      </PropertySection>
    </>
  );
}

function GeneralizationsSection({
  project,
  umlClass,
  projection,
  revision,
  onRefreshProject,
}: {
  project: ProjectDto;
  umlClass: UmlClassDto;
  projection?: ClassProjectionDto;
  revision?: string;
  onRefreshProject: () => Promise<boolean>;
}) {
  const directIds = projection?.directSuperClasses.map((type) => type.id) ?? umlClass.superClassIds ?? [];
  const candidates = project.umlModel.classes.filter(
    (candidate) => candidate.id !== umlClass.id && !directIds.includes(candidate.id),
  );
  const localFeatures = [...(projection?.attributes ?? []), ...(projection?.operations ?? [])].filter(
    (feature) => !feature.inherited,
  );
  const inheritedFeatures = [...(projection?.attributes ?? []), ...(projection?.operations ?? [])].filter(
    (feature) => feature.inherited,
  );
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '');
  const [localFeatureId, setLocalFeatureId] = useState(localFeatures[0]?.id ?? '');
  const [targetFeatureId, setTargetFeatureId] = useState(inheritedFeatures[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const run = async (command: () => Promise<unknown>, success: string) => {
    if (!revision) {
      setFeedback({ kind: 'error', text: 'The model revision is not available. Refresh the project.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await command();
      await onRefreshProject();
      setFeedback({ kind: 'success', text: success });
    } catch (error) {
      const message = error instanceof ApiClientError
        ? `${error.dto.userMessage ?? error.message} (${error.dto.code})`
        : 'The hierarchy change could not be saved.';
      setFeedback({ kind: 'error', text: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PropertySection title="Generalizations">
      <label className="property-checkbox">
        <input
          type="checkbox"
          checked={projection?.abstractClass ?? umlClass.abstract ?? false}
          disabled={busy || !revision}
          onChange={(event) => {
            const abstractClass = event.target.checked;
            void run(
              () => modelCommandApi.updateClass(project.project.id, umlClass.id, {
                expectedRevision: revision ?? '',
                draft: {
                  ...umlClass,
                  abstractClass,
                  superClassIds: directIds,
                  visibility: 'PUBLIC',
                  qualifiedName: projection?.qualifiedName ?? umlClass.name,
                },
              }),
              abstractClass ? 'Class marked as abstract.' : 'Class marked as concrete.',
            );
          }}
        />
        Abstract class
      </label>

      <div className="generalization-chain" aria-label="Inheritance chain">
        <strong>{umlClass.name}</strong>
        {(projection?.generalizationOrder ?? []).map((type) => (
          <span key={type.id}>→ {type.name}</span>
        ))}
      </div>

      <h5>Current direct supertypes</h5>
      {directIds.length === 0 ? <p className="property-empty">No direct supertypes.</p> : null}
      {(projection?.directSuperClasses ?? []).map((type) => (
        <div className="generalization-row" key={type.id}>
          <button type="button" onClick={() => appStoreActions.select({ view: 'class-diagram', type: 'class', id: type.id })}>
            {type.name}
          </button>
          <DeleteActionButton
            label="Delete generalization"
            confirmMessage={`Delete the generalization from ${umlClass.name} to ${type.name}?`}
            onDelete={() => run(
              () => modelCommandApi.setGeneralizations(project.project.id, umlClass.id, {
                expectedRevision: revision ?? '',
                draft: { supertypeIds: directIds.filter((id) => id !== type.id) },
              }),
              `Generalization to ${type.name} deleted.`,
            )}
          />
        </div>
      ))}

      <div className="property-inline-command">
        <label><span>Superclass candidate</span><select value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select></label>
        <button type="button" disabled={!candidateId || busy || !revision} onClick={() => void run(
          () => modelCommandApi.setGeneralizations(project.project.id, umlClass.id, {
            expectedRevision: revision ?? '', draft: { supertypeIds: [...directIds, candidateId] },
          }),
          'Generalization added.',
        )}>Add supertype</button>
      </div>

      <h5>Inherited features</h5>
      {inheritedFeatures.length === 0 ? <p className="property-empty">No inherited features.</p> : inheritedFeatures.map((feature) => (
        <div className="inherited-feature" key={`${feature.kind}-${feature.id}`}>
          <strong>{feature.name} : {feature.type}</strong>
          <span>Inherited from {feature.definingClassifier.name} · read-only</span>
        </div>
      ))}

      {localFeatures.length > 0 && inheritedFeatures.length > 0 ? (
        <div className="property-redefinition">
          <h5>Explicit redefinition</h5>
          <label><span>Local feature</span><select value={localFeatureId} onChange={(event) => setLocalFeatureId(event.target.value)}>
            {localFeatures.map((feature) => <option key={feature.id} value={feature.id}>{feature.name} ({feature.kind})</option>)}
          </select></label>
          <label><span>Inherited target</span><select value={targetFeatureId} onChange={(event) => setTargetFeatureId(event.target.value)}>
            {inheritedFeatures.map((feature) => <option key={feature.id} value={feature.id}>{feature.definingClassifier.name}::{feature.name}</option>)}
          </select></label>
          <button type="button" disabled={busy || !revision || !localFeatureId || !targetFeatureId} onClick={() => {
            const local = localFeatures.find((feature) => feature.id === localFeatureId);
            void run(() => modelCommandApi.setRedefinition(project.project.id, umlClass.id, {
              expectedRevision: revision ?? '',
              draft: {
                featureKind: local?.kind === 'OPERATION' ? 'OPERATION' : 'ATTRIBUTE',
                localFeatureId,
                redefinedFeatureIds: [targetFeatureId],
              },
            }), 'Explicit redefinition saved.');
          }}>Confirm redefinition</button>
          <p className="property-hint">The backend validates ownership and compatibility. Equal names alone do not create a redefinition.</p>
        </div>
      ) : null}

      {feedback ? <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={`property-feedback ${feedback.kind}`}>{feedback.text}</p> : null}
    </PropertySection>
  );
}

function ClassAssociationAccess({
  project,
  umlClass,
  associations,
}: {
  project: ProjectDto;
  umlClass: UmlClassDto;
  associations: UmlAssociationDto[];
}) {
  return (
    <PropertySection
      title="Related Associations"
      actionLabel="Add Association"
      onAction={() =>
        appStoreActions.openModal({
          type: 'addClassAssociation',
          sourceClassId: umlClass.id,
        })
      }
    >
      {associations.length === 0 ? (
        <p className="property-empty">No associations reference this class.</p>
      ) : (
        <div className="property-related-list">
          {associations.map((association) => (
            <EditableAssociationSummary
              key={association.id}
              project={project}
              association={association}
            />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function ClassInvariantAccess({
  umlClass,
  invariants,
}: {
  umlClass: UmlClassDto;
  invariants: UmlInvariantDto[];
}) {
  return (
    <PropertySection
      title="Class Invariants"
      actionLabel="Add Invariant"
      onAction={() =>
        appStoreActions.openModal({
          type: 'addInvariant',
          contextClassId: umlClass.id,
        })
      }
    >
      {invariants.length === 0 ? (
        <p className="property-empty">No invariants are defined for this class.</p>
      ) : (
        <div className="property-related-list">
          {invariants.map((invariant) => (
            <InvariantSummary key={invariant.id} invariant={invariant} />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function EditableAssociationSummary({
  project,
  association,
}: {
  project: ProjectDto;
  association: UmlAssociationDto;
}) {
  return (
    <div className="property-related-editor">
      <button
        type="button"
        className="property-related-item"
        onClick={() =>
          appStoreActions.select({
            view: 'class-diagram',
            type: 'association',
            id: association.id,
          })
        }
      >
        <strong>{association.name || '<unnamed association>'}</strong>
        <span>{formatAssociationSummary(project, association)}</span>
      </button>
      <p className="property-hint">Open the association to edit or delete it through the revision-protected Association Properties workflow.</p>
    </div>
  );
}

function InvariantSummary({ invariant }: { invariant: UmlInvariantDto }) {
  return (
    <div className="property-related-editor">
      <button
        type="button"
        className="property-related-item"
        onClick={() =>
          appStoreActions.select({
            view: 'class-diagram',
            type: 'invariant',
            id: invariant.id,
          })
        }
      >
        <strong>{invariant.name || '<unnamed invariant>'}</strong>
        <span>{invariant.expression || '<empty OCL expression>'}</span>
      </button>
      <p className="property-hint">Open the invariant to edit or delete it through the revision-protected Invariant Properties workflow.</p>
    </div>
  );
}

function formatAssociationSummary(project: ProjectDto, association: UmlAssociationDto) {
  return association.ends
    .map((end) => {
      const className = findClassName(project, end.classId);
      const role = end.roleName ? `.${end.roleName}` : '';

      return `${className}${role} [${formatMultiplicity(end.multiplicity)}]`;
    })
    .join(' - ');
}

function findClassName(project: ProjectDto, classId: string) {
  return project.umlModel.classes.find((umlClass) => umlClass.id === classId)?.name ?? classId;
}

interface PropertyTextFieldProps {
  label: string;
  value: string;
  readOnly?: boolean;
  error?: string | null;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
}

export function PropertyTextField({
  label,
  value,
  readOnly = false,
  error,
  onChange,
  onCommit,
}: PropertyTextFieldProps) {
  return (
    <label className="property-field">
      <span>{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={(event) => onCommit?.(event.target.value)}
      />
      {error ? <small className="property-field-error">{error}</small> : null}
    </label>
  );
}

interface TypeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TypeSelect({ label, value, onChange }: TypeSelectProps) {
  const primitiveTypes = ['String', 'Integer', 'Real', 'Boolean'];
  const options = primitiveTypes.includes(value) ? primitiveTypes : [value, ...primitiveTypes];

  return (
    <label className="property-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisibilitySelect({ label, value, onChange }: { label: string; value: UmlVisibilityDto; onChange: (value: UmlVisibilityDto) => void }) {
  const options: Array<{ value: UmlVisibilityDto; label: string }> = [
    { value: 'PUBLIC', label: '+ public' },
    { value: 'PRIVATE', label: '- private' },
    { value: 'PROTECTED', label: '# protected' },
    { value: 'PACKAGE', label: '~ package' },
  ];
  return (
    <label className="property-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as UmlVisibilityDto)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

interface PropertySectionProps {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
}

export function PropertySection({
  title,
  actionLabel,
  children,
  onAction,
}: PropertySectionProps) {
  return (
    <section className="property-section">
      <div className="property-section-header">
        <h4>{title}</h4>
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
