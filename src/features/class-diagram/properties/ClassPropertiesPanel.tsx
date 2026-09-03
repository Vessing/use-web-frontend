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
  const [featureTab, setFeatureTab] = useState<'details' | 'attributes' | 'operations' | 'generalizations' | 'definitions'>('details');
  const [savingNamespace, setSavingNamespace] = useState(false);

  const changeNamespace = async (packageId: string | null) => {
    const revision = readModel?.readVersion;
    if (!revision) {
      appStoreActions.addConsoleLog({
        level: 'error',
        source: 'api',
        message: 'The model revision is not available. Refresh the project before changing the namespace.',
      });
      return;
    }

    setSavingNamespace(true);
    try {
      await modelCommandApi.updateClass(project.project.id, umlClass.id, {
        expectedRevision: revision,
        draft: {
          ...umlClass,
          packageId,
          superClassIds: umlClass.superClassIds ?? [],
          visibility: umlClass.visibility ?? 'PUBLIC',
          qualifiedName: projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name,
        },
      });
      await onRefreshProject();
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `Namespace of "${umlClass.name}" saved.`,
      });
    } catch (error) {
      const message = error instanceof ApiClientError
        ? `${error.dto.code}: ${error.dto.userMessage ?? error.message}`
        : 'The class namespace could not be saved.';
      appStoreActions.addConsoleLog({ level: 'error', source: 'api', message });
    } finally {
      setSavingNamespace(false);
    }
  };

  return (
    <>
      <header className="class-properties-summary">
        <strong>{umlClass.name}</strong>
        <span>{projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name} · {(umlClass.visibility ?? 'PUBLIC').toLowerCase()}</span>
      </header>
      <div className="class-feature-tabs" role="tablist" aria-label="Class features">
        <FeatureTab active={featureTab === 'details'} label="Details" onClick={() => setFeatureTab('details')} />
        <FeatureTab active={featureTab === 'attributes'} label="Attributes" onClick={() => setFeatureTab('attributes')} />
        <FeatureTab active={featureTab === 'operations'} label="Operations" onClick={() => setFeatureTab('operations')} />
        <FeatureTab active={featureTab === 'generalizations'} label="Generalizations" onClick={() => setFeatureTab('generalizations')} />
        <FeatureTab active={featureTab === 'definitions'} label="Definitions" onClick={() => setFeatureTab('definitions')} />
      </div>

      {featureTab === 'details' ? <>
        <h4 className="class-feature-heading">Class Details</h4>
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
        <PropertyTextField label="Qualified Name" value={projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name} readOnly />
        <VisibilitySelect label="Class Visibility" value={umlClass.visibility ?? 'PUBLIC'} onChange={(visibility) =>
          syncProjectChange({ projectId: project.project.id, nextProject: updateClass(project, umlClass.id, (current) => ({ ...current, visibility })), onProjectChange, successMessage: `Visibility of "${umlClass.name}" saved.` })
        } />
        <label className="property-checkbox">
          <input
            type="checkbox"
            checked={projection?.abstractClass ?? umlClass.abstract ?? false}
            onChange={(event) => syncProjectChange({
              projectId: project.project.id,
              nextProject: updateClass(project, umlClass.id, (current) => ({
                ...current,
                abstractClass: event.target.checked,
              })),
              onProjectChange,
              successMessage: event.target.checked
                ? `Class "${umlClass.name}" marked as abstract.`
                : `Class "${umlClass.name}" marked as concrete.`,
            })}
          />
          Abstract class
        </label>
        <label className="property-field"><span>Package / Namespace</span><select value={umlClass.packageId ?? ''} disabled={savingNamespace} onChange={(event) => {
          void changeNamespace(event.target.value || null);
        }}><option value="">Project root</option>{(project.umlModel.packages ?? []).map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}</select></label>
        <DeleteActionButton label="Delete Class" confirmMessage={`Delete class "${umlClass.name}"? Dependent associations, invariants, objects, links, layout entries and validation markers may be removed by the backend.`} onDelete={() =>
          deleteProjectElementAndSync({ project, deleteRequest: () => umlApi.deleteClass(project.project.id, umlClass.id), onProjectChange, successMessage: `Class "${umlClass.name}" deleted.` }).then(() => undefined)
        } />
      </> : null}

      {featureTab === 'attributes' ? <PropertySection title="Attributes">
        <AttributePropertiesSection project={project} umlClass={umlClass} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} />
      </PropertySection> : null}

      {featureTab === 'operations' ? <PropertySection title="Operations">
        <OperationPropertiesSection
          project={project}
          umlClass={umlClass}
          revision={readModel?.readVersion ?? ''}
          onRefreshProject={onRefreshProject}
        />
      </PropertySection> : null}

      {featureTab === 'generalizations' ? <GeneralizationsSection
        project={project}
        umlClass={umlClass}
        projection={projection}
        revision={readModel?.readVersion}
        onRefreshProject={onRefreshProject}
      /> : null}

      {featureTab === 'definitions' ? <PropertySection title="Definitions">
        <DefinitionPropertiesSection project={project} ownerKind="CLASS" ownerId={umlClass.id} ownerName={projection?.qualifiedName ?? umlClass.qualifiedName ?? umlClass.name} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} />
      </PropertySection> : null}
    </>
  );
}

function FeatureTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? 'active' : undefined} onClick={onClick}>{label}</button>;
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
  const directSupertypes = projection?.directSuperClasses ?? directIds
    .map((id) => project.umlModel.classes.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is UmlClassDto => Boolean(candidate))
    .map((candidate) => ({ id: candidate.id, name: candidate.name, qualifiedName: candidate.qualifiedName ?? candidate.name, kind: 'CLASS' as const }));
  const candidates = project.umlModel.classes.filter(
    (candidate) => candidate.id !== umlClass.id && !directIds.includes(candidate.id),
  );
  const localFeatures = [...(projection?.attributes ?? []), ...(projection?.operations ?? [])].filter(
    (feature) => !feature.inherited,
  );
  const inheritedFeatures = [...(projection?.attributes ?? []), ...(projection?.operations ?? [])].filter(
    (feature) => feature.inherited,
  );
  const [selectedSupertypeId, setSelectedSupertypeId] = useState(directIds[0] ?? '');
  const [showCandidates, setShowCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const selectedSupertype = directSupertypes.find((type) => type.id === selectedSupertypeId)
    ?? directSupertypes[0];
  const selectedChain = selectedSupertype
    ? inheritanceChain(project, umlClass.id, selectedSupertype.id)
    : [umlClass.name];
  const selectedInheritedFeatures = selectedSupertype
    ? inheritedFeatures.filter((feature) =>
      feature.definingClassifier.id === selectedSupertype.id
      || selectedChain.includes(feature.definingClassifier.name),
    )
    : [];
  const selectedInheritedAttributes = selectedInheritedFeatures.filter(
    (feature) => feature.kind === 'ATTRIBUTE',
  );
  const selectedInheritedOperations = selectedInheritedFeatures.filter(
    (feature) => feature.kind === 'OPERATION',
  );
  const redefinitionResolutions = localFeatures
    .filter((feature) => feature.redefinedFeatures.length > 0)
    .map((feature) => ({ feature, targets: feature.redefinedFeatures }));
  const redefinedTargetIds = new Set(
    redefinitionResolutions.flatMap(({ targets }) => targets.map((target) => target.id)),
  );

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
      <div className="property-inline-command">
        <label className="property-field"><span>Generalization</span><select aria-label="Generalization" value={selectedSupertype?.id ?? ''} onChange={(event) => setSelectedSupertypeId(event.target.value)}>
          {directSupertypes.length === 0 ? <option value="">No direct generalizations</option> : null}
          {directSupertypes.map((type) => <option key={type.id} value={type.id}>{umlClass.name} → {type.name}</option>)}
        </select></label>
        <button type="button" disabled={busy || !revision} onClick={() => setShowCandidates(true)}>Add Generalization</button>
      </div>

      {showCandidates ? <section className="generalization-candidates" aria-label="Superclass candidates">
        <h5>Superclass candidates</h5>
        {candidates.length === 0 ? <p className="property-empty">No superclass candidates are available.</p> : candidates.map((candidate) => (
          <button type="button" className="generalization-candidate" key={candidate.id} disabled={busy || !revision} onClick={() => void run(
          () => modelCommandApi.setGeneralizations(project.project.id, umlClass.id, {
            expectedRevision: revision ?? '', draft: { supertypeIds: [...directIds, candidate.id] },
          }),
          `Generalization to ${candidate.name} added.`,
        )}>{candidate.name}<small>Add direct supertype</small></button>))}
      </section> : null}

      {selectedSupertype ? <section className="generalization-details">
        <h5>Generalization Details</h5>
        <label className="property-field"><span>Subclass</span><input readOnly value={umlClass.name} /></label>
        <label className="property-field"><span>Superclass</span><input readOnly value={selectedSupertype.name} /></label>
        <label className="property-field"><span>Inheritance chain</span><input readOnly value={selectedChain.join(' → ')} /></label>
        <DeleteActionButton
          label="Delete generalization"
          confirmMessage={`Delete the generalization from ${umlClass.name} to ${selectedSupertype.name}?`}
          onDelete={() => run(
            () => modelCommandApi.setGeneralizations(project.project.id, umlClass.id, {
              expectedRevision: revision ?? '',
              draft: { supertypeIds: directIds.filter((id) => id !== selectedSupertype.id) },
            }),
            `Generalization to ${selectedSupertype.name} deleted.`,
          )}
        />
      </section> : null}

      <section className="inherited-feature-section">
        <h5>Inherited Attributes</h5>
        {selectedInheritedAttributes.length === 0 ? <p className="property-empty">No inherited attributes for the selected generalization.</p> : selectedInheritedAttributes.map((feature) => (
          <InheritedFeature key={feature.id} feature={feature} redefinedTargetIds={redefinedTargetIds} />
        ))}
      </section>

      <section className="inherited-feature-section">
        <h5>Inherited Operations</h5>
        {selectedInheritedOperations.length === 0 ? <p className="property-empty">No inherited operations for the selected generalization.</p> : selectedInheritedOperations.map((feature) => (
          <InheritedFeature key={feature.id} feature={feature} redefinedTargetIds={redefinedTargetIds} />
        ))}
      </section>

      {redefinitionResolutions.length > 0 ? <section className="property-redefinition">
        <h5>Feature Resolution</h5>
        {redefinitionResolutions.map(({ feature, targets }) => <div className="redefinition-resolution" key={feature.id}>
          <strong>{umlClass.name}::{feature.name} : {feature.type}</strong>
          {targets.map((target) => <span key={target.id}>redefines {target.qualifiedName}</span>)}
        </div>)}
        <p className="property-hint">Redefinitions are explicit, stable relationships validated by the backend. Matching feature names alone do not create one.</p>
      </section> : null}

      {feedback ? <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={`property-feedback ${feedback.kind}`}>{feedback.text}</p> : null}
    </PropertySection>
  );
}

function InheritedFeature({
  feature,
  redefinedTargetIds,
}: {
  feature: ClassProjectionDto['attributes'][number] | ClassProjectionDto['operations'][number];
  redefinedTargetIds: Set<string>;
}) {
  return (
    <div className="inherited-feature">
      <strong>{feature.name} : {feature.type}</strong>
      <span>{redefinedTargetIds.has(feature.id)
        ? `Redefined locally from ${feature.definingClassifier.name} · read-only`
        : `Inherited from ${feature.definingClassifier.name} · read-only`}</span>
    </div>
  );
}

function inheritanceChain(project: ProjectDto, subclassId: string, directSupertypeId: string): string[] {
  const names = [project.umlModel.classes.find((candidate) => candidate.id === subclassId)?.name ?? subclassId];
  const visited = new Set<string>([subclassId]);
  let currentId: string | undefined = directSupertypeId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const current = project.umlModel.classes.find((candidate) => candidate.id === currentId);
    if (!current) break;
    names.push(current.name);
    currentId = current.superClassIds?.[0];
  }
  return names;
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
