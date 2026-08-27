import { useMemo, useState, type ReactNode } from 'react';

import { umlApi } from '../../../api';
import type {
  ProjectDto,
  UmlAssociationDto,
  UmlClassDto,
  UmlInvariantDto,
} from '../../../api/dtos';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { appStoreActions } from '../../../state';
import { formatMultiplicity } from '../../diagram-core';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import {
  addAttribute,
  addOperation,
  updateAssociation,
  updateAssociationEnd,
  updateAttribute,
  updateClass,
  updateInvariant,
  updateOperation,
} from './projectUpdates';
import { parseMultiplicity } from './multiplicity';

interface ClassPropertiesPanelProps {
  project: ProjectDto;
  umlClass: UmlClassDto;
  onProjectChange: (project: ProjectDto) => void;
}

export function ClassPropertiesPanel({
  project,
  umlClass,
  onProjectChange,
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
          onProjectChange={onProjectChange}
        />
      ) : null}

      {activeTab === 'associations' ? (
        <ClassAssociationAccess
          project={project}
          umlClass={umlClass}
          associations={relatedAssociations}
          onProjectChange={onProjectChange}
        />
      ) : null}

      {activeTab === 'invariants' ? (
        <ClassInvariantAccess
          project={project}
          umlClass={umlClass}
          invariants={relatedInvariants}
          onProjectChange={onProjectChange}
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
}: ClassPropertiesPanelProps & { nameError: string | null }) {
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
        actionLabel="Add Attribute"
        onAction={() => {
          const result = addAttribute(project, umlClass.id);
          syncProjectChange({
            projectId: project.project.id,
            nextProject: result.project,
            onProjectChange,
            successMessage: `Attribute added to "${umlClass.name}".`,
          });
        }}
      >
        {umlClass.attributes.length === 0 ? (
          <p className="property-empty">No attributes defined.</p>
        ) : (
          umlClass.attributes.map((attribute) => (
            <div key={attribute.id} className="property-row-with-action">
              <div className="property-row-grid">
                <PropertyTextField
                  label="Name"
                  value={attribute.name}
                  error={attribute.name.trim() ? null : 'Required'}
                  onChange={(name) => {
                    onProjectChange(updateAttribute(project, umlClass.id, attribute.id, { name }));
                    appStoreActions.markValidationStale();
                  }}
                  onCommit={(name) =>
                    syncProjectChange({
                      projectId: project.project.id,
                      nextProject: updateAttribute(project, umlClass.id, attribute.id, { name }),
                      onProjectChange,
                      successMessage: `Attribute "${name}" saved.`,
                    })
                  }
                />
                <TypeSelect
                  label="Type"
                  value={attribute.type}
                  onChange={(type) =>
                    syncProjectChange({
                      projectId: project.project.id,
                      nextProject: updateAttribute(project, umlClass.id, attribute.id, { type }),
                      onProjectChange,
                      successMessage: `Attribute "${attribute.name}" saved.`,
                    })
                  }
                />
              </div>
              <DeleteActionButton
                label="Delete Attribute"
                confirmMessage={`Delete attribute "${attribute.name}" from class "${umlClass.name}"? Matching slots and validation markers may be removed by the backend.`}
                onDelete={() =>
                  deleteProjectElementAndSync({
                    project,
                    deleteRequest: () =>
                      umlApi.deleteAttribute(project.project.id, umlClass.id, attribute.id),
                    onProjectChange,
                    successMessage: `Attribute "${attribute.name}" deleted.`,
                  }).then(() => undefined)
                }
              />
            </div>
          ))
        )}
      </PropertySection>

      <PropertySection
        title="Operations"
        actionLabel="Add Operation"
        onAction={() => {
          const result = addOperation(project, umlClass.id);
          syncProjectChange({
            projectId: project.project.id,
            nextProject: result.project,
            onProjectChange,
            successMessage: `Operation added to "${umlClass.name}".`,
          });
        }}
      >
        {umlClass.operations.length === 0 ? (
          <p className="property-empty">No operations defined.</p>
        ) : (
          umlClass.operations.map((operation) => (
            <div key={operation.id} className="property-row-with-action">
              <div className="property-row-grid">
                <PropertyTextField
                  label="Name"
                  value={operation.name}
                  error={operation.name.trim() ? null : 'Required'}
                  onChange={(name) => {
                    onProjectChange(updateOperation(project, umlClass.id, operation.id, { name }));
                    appStoreActions.markValidationStale();
                  }}
                  onCommit={(name) =>
                    syncProjectChange({
                      projectId: project.project.id,
                      nextProject: updateOperation(project, umlClass.id, operation.id, { name }),
                      onProjectChange,
                      successMessage: `Operation "${name}" saved.`,
                    })
                  }
                />
                <TypeSelect
                  label="Return"
                  value={operation.returnType}
                  onChange={(returnType) =>
                    syncProjectChange({
                      projectId: project.project.id,
                      nextProject: updateOperation(project, umlClass.id, operation.id, {
                        returnType,
                      }),
                      onProjectChange,
                      successMessage: `Operation "${operation.name}" saved.`,
                    })
                  }
                />
              </div>
              <DeleteActionButton
                label="Delete Operation"
                confirmMessage={`Delete operation "${operation.name}" from class "${umlClass.name}"?`}
                onDelete={() =>
                  deleteProjectElementAndSync({
                    project,
                    deleteRequest: () =>
                      umlApi.deleteOperation(project.project.id, umlClass.id, operation.id),
                    onProjectChange,
                    successMessage: `Operation "${operation.name}" deleted.`,
                  }).then(() => undefined)
                }
              />
            </div>
          ))
        )}
      </PropertySection>
    </>
  );
}

function ClassAssociationAccess({
  project,
  umlClass,
  associations,
  onProjectChange,
}: {
  project: ProjectDto;
  umlClass: UmlClassDto;
  associations: UmlAssociationDto[];
  onProjectChange: (project: ProjectDto) => void;
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
              onProjectChange={onProjectChange}
            />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function ClassInvariantAccess({
  project,
  umlClass,
  invariants,
  onProjectChange,
}: {
  project: ProjectDto;
  umlClass: UmlClassDto;
  invariants: UmlInvariantDto[];
  onProjectChange: (project: ProjectDto) => void;
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
            <EditableInvariantSummary
              key={invariant.id}
              project={project}
              invariant={invariant}
              onProjectChange={onProjectChange}
            />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function EditableAssociationSummary({
  project,
  association,
  onProjectChange,
}: {
  project: ProjectDto;
  association: UmlAssociationDto;
  onProjectChange: (project: ProjectDto) => void;
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
      <PropertyTextField
        label="Association Name"
        value={association.name}
        error={association.name.trim() ? null : 'Required'}
        onChange={(name) => {
          onProjectChange(
            updateAssociation(project, association.id, (current) => ({ ...current, name })),
          );
          appStoreActions.markValidationStale();
        }}
        onCommit={(name) =>
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateAssociation(project, association.id, (current) => ({
              ...current,
              name,
            })),
            onProjectChange,
            successMessage: `Association "${name}" saved.`,
          })
        }
      />
      <div className="property-row-grid">
        {association.ends.map((end, index) => (
          <div key={end.id} className="property-nested-group">
            <strong>{index === 0 ? 'Source End' : 'Target End'}</strong>
            <PropertyTextField label="Class" value={findClassName(project, end.classId)} readOnly />
            <PropertyTextField
              label="Role"
              value={end.roleName}
              error={end.roleName.trim() ? null : 'Required'}
              onChange={(roleName) => {
                onProjectChange(
                  updateAssociationEnd(project, association.id, end.id, { roleName }),
                );
                appStoreActions.markValidationStale();
              }}
              onCommit={(roleName) =>
                syncProjectChange({
                  projectId: project.project.id,
                  nextProject: updateAssociationEnd(project, association.id, end.id, {
                    roleName,
                  }),
                  onProjectChange,
                  successMessage: `Association role "${roleName}" saved.`,
                })
              }
            />
            <PropertyTextField
              label="Multiplicity"
              value={formatMultiplicity(end.multiplicity)}
              onChange={(raw) => {
                const multiplicity = parseMultiplicity(raw);
                if (multiplicity) {
                  onProjectChange(
                    updateAssociationEnd(project, association.id, end.id, { multiplicity }),
                  );
                  appStoreActions.markValidationStale();
                }
              }}
              onCommit={(raw) => {
                const multiplicity = parseMultiplicity(raw);
                if (multiplicity) {
                  syncProjectChange({
                    projectId: project.project.id,
                    nextProject: updateAssociationEnd(project, association.id, end.id, {
                      multiplicity,
                    }),
                    onProjectChange,
                    successMessage: `Association multiplicity "${raw}" saved.`,
                  });
                }
              }}
            />
          </div>
        ))}
      </div>
      <DeleteActionButton
        label="Delete Association"
        confirmMessage={`Delete association "${association.name}"? Matching object links, layout entries and validation markers may be removed by the backend.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => umlApi.deleteAssociation(project.project.id, association.id),
            onProjectChange,
            successMessage: `Association "${association.name}" deleted.`,
          }).then(() => undefined)
        }
      />
    </div>
  );
}

function EditableInvariantSummary({
  project,
  invariant,
  onProjectChange,
}: {
  project: ProjectDto;
  invariant: UmlInvariantDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
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
      <PropertyTextField
        label="Invariant Name"
        value={invariant.name}
        error={invariant.name.trim() ? null : 'Required'}
        onChange={(name) => {
          onProjectChange(updateInvariant(project, invariant.id, { name }));
          appStoreActions.markValidationStale();
        }}
        onCommit={(name) =>
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateInvariant(project, invariant.id, { name }),
            onProjectChange,
            successMessage: `Invariant "${name}" saved.`,
          })
        }
      />
      <label className="property-field">
        <span>OCL Expression</span>
        <textarea
          value={invariant.expression}
          rows={4}
          aria-invalid={invariant.expression.trim() ? undefined : true}
          onChange={(event) => {
            onProjectChange(
              updateInvariant(project, invariant.id, {
                expression: event.target.value,
              }),
            );
            appStoreActions.markValidationStale();
          }}
          onBlur={(event) =>
            syncProjectChange({
              projectId: project.project.id,
              nextProject: updateInvariant(project, invariant.id, {
                expression: event.target.value,
              }),
              onProjectChange,
              successMessage: `Invariant "${invariant.name}" saved.`,
            })
          }
        />
        {invariant.expression.trim() ? null : (
          <small className="property-field-error">OCL expression is required.</small>
        )}
      </label>
      <DeleteActionButton
        label="Delete Invariant"
        confirmMessage={`Delete invariant "${invariant.name}"? Related validation results will be cleared from the UI.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => umlApi.deleteInvariant(project.project.id, invariant.id),
            onProjectChange,
            successMessage: `Invariant "${invariant.name}" deleted.`,
          }).then(() => undefined)
        }
      />
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
