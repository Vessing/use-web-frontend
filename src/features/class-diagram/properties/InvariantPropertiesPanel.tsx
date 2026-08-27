import type { ProjectDto, UmlInvariantDto } from '../../../api/dtos';
import { umlApi } from '../../../api';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { appStoreActions } from '../../../state';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import { updateInvariant } from './projectUpdates';
import { PropertySection, PropertyTextField } from './ClassPropertiesPanel';

interface InvariantPropertiesPanelProps {
  project: ProjectDto;
  invariant: UmlInvariantDto;
  onProjectChange: (project: ProjectDto) => void;
}

export function InvariantPropertiesPanel({
  project,
  invariant,
  onProjectChange,
}: InvariantPropertiesPanelProps) {
  return (
    <div className="properties-content">
      <h3>Invariant Properties</h3>
      <PropertyTextField label="Invariant ID" value={invariant.id} readOnly />
      <PropertyTextField
        label="Invariant Name"
        value={invariant.name}
        error={invariant.name.trim() ? null : 'Invariant name is required.'}
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
      <label className="property-field">
        <span>Context Class</span>
        <select
          value={invariant.contextClassId}
          onChange={(event) =>
            syncProjectChange({
              projectId: project.project.id,
              nextProject: updateInvariant(project, invariant.id, {
                contextClassId: event.target.value,
              }),
              onProjectChange,
              successMessage: `Invariant "${invariant.name}" saved.`,
            })
          }
        >
          {project.umlModel.classes.map((umlClass) => (
            <option key={umlClass.id} value={umlClass.id}>
              {umlClass.name}
            </option>
          ))}
        </select>
      </label>

      <PropertySection title="OCL Expression">
        <label className="property-field">
          <span>Expression</span>
          <textarea
            value={invariant.expression}
            rows={5}
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
      </PropertySection>
    </div>
  );
}
