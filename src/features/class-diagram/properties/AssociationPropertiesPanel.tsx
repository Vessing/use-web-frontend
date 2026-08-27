import type { ProjectDto, UmlAssociationDto } from '../../../api/dtos';
import { formatMultiplicity } from '../../diagram-core';
import { umlApi } from '../../../api';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { appStoreActions } from '../../../state';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { parseMultiplicity } from './multiplicity';
import { updateAssociation, updateAssociationEnd } from './projectUpdates';
import { PropertySection, PropertyTextField } from './ClassPropertiesPanel';

interface AssociationPropertiesPanelProps {
  project: ProjectDto;
  association: UmlAssociationDto;
  onProjectChange: (project: ProjectDto) => void;
}

export function AssociationPropertiesPanel({
  project,
  association,
  onProjectChange,
}: AssociationPropertiesPanelProps) {
  const [sourceEnd, targetEnd] = association.ends;

  return (
    <div className="properties-content">
      <h3>Association Properties</h3>
      <PropertyTextField label="Association ID" value={association.id} readOnly />
      <PropertyTextField
        label="Association Name"
        value={association.name}
        error={association.name.trim() ? null : 'Association name is required.'}
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

      {sourceEnd ? (
        <PropertySection title="Source End">
          <AssociationEndFields
            className={findClassName(project, sourceEnd.classId)}
            roleName={sourceEnd.roleName}
            multiplicity={formatMultiplicity(sourceEnd.multiplicity)}
            onRoleNameChange={(roleName) => {
              onProjectChange(
                updateAssociationEnd(project, association.id, sourceEnd.id, { roleName }),
              );
              appStoreActions.markValidationStale();
            }}
            onRoleNameCommit={(roleName) =>
              syncProjectChange({
                projectId: project.project.id,
                nextProject: updateAssociationEnd(project, association.id, sourceEnd.id, {
                  roleName,
                }),
                onProjectChange,
                successMessage: `Association role "${roleName}" saved.`,
              })
            }
            onMultiplicityChange={(raw) => {
              const multiplicity = parseMultiplicity(raw);
              if (multiplicity) {
                onProjectChange(
                  updateAssociationEnd(project, association.id, sourceEnd.id, { multiplicity }),
                );
                appStoreActions.markValidationStale();
              }
            }}
            onMultiplicityCommit={(raw) => {
              const multiplicity = parseMultiplicity(raw);
              if (multiplicity) {
                syncProjectChange({
                  projectId: project.project.id,
                  nextProject: updateAssociationEnd(project, association.id, sourceEnd.id, {
                    multiplicity,
                  }),
                  onProjectChange,
                  successMessage: `Association multiplicity "${raw}" saved.`,
                });
              }
            }}
          />
        </PropertySection>
      ) : null}

      {targetEnd ? (
        <PropertySection title="Target End">
          <AssociationEndFields
            className={findClassName(project, targetEnd.classId)}
            roleName={targetEnd.roleName}
            multiplicity={formatMultiplicity(targetEnd.multiplicity)}
            onRoleNameChange={(roleName) => {
              onProjectChange(
                updateAssociationEnd(project, association.id, targetEnd.id, { roleName }),
              );
              appStoreActions.markValidationStale();
            }}
            onRoleNameCommit={(roleName) =>
              syncProjectChange({
                projectId: project.project.id,
                nextProject: updateAssociationEnd(project, association.id, targetEnd.id, {
                  roleName,
                }),
                onProjectChange,
                successMessage: `Association role "${roleName}" saved.`,
              })
            }
            onMultiplicityChange={(raw) => {
              const multiplicity = parseMultiplicity(raw);
              if (multiplicity) {
                onProjectChange(
                  updateAssociationEnd(project, association.id, targetEnd.id, { multiplicity }),
                );
                appStoreActions.markValidationStale();
              }
            }}
            onMultiplicityCommit={(raw) => {
              const multiplicity = parseMultiplicity(raw);
              if (multiplicity) {
                syncProjectChange({
                  projectId: project.project.id,
                  nextProject: updateAssociationEnd(project, association.id, targetEnd.id, {
                    multiplicity,
                  }),
                  onProjectChange,
                  successMessage: `Association multiplicity "${raw}" saved.`,
                });
              }
            }}
          />
        </PropertySection>
      ) : null}
    </div>
  );
}

interface AssociationEndFieldsProps {
  className: string;
  roleName: string;
  multiplicity: string;
  onRoleNameChange: (value: string) => void;
  onRoleNameCommit: (value: string) => void;
  onMultiplicityChange: (value: string) => void;
  onMultiplicityCommit: (value: string) => void;
}

function AssociationEndFields({
  className,
  roleName,
  multiplicity,
  onRoleNameChange,
  onRoleNameCommit,
  onMultiplicityChange,
  onMultiplicityCommit,
}: AssociationEndFieldsProps) {
  return (
    <>
      <PropertyTextField label="Class" value={className} readOnly />
      <PropertyTextField
        label="Role"
        value={roleName}
        error={roleName.trim() ? null : 'Role name is required for OCL navigation.'}
        onChange={onRoleNameChange}
        onCommit={onRoleNameCommit}
      />
      <PropertyTextField
        label="Multiplicity"
        value={multiplicity}
        onChange={onMultiplicityChange}
        onCommit={onMultiplicityCommit}
      />
    </>
  );
}

function findClassName(project: ProjectDto, classId: string) {
  return project.umlModel.classes.find((umlClass) => umlClass.id === classId)?.name ?? classId;
}
