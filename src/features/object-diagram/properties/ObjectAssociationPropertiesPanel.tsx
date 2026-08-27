import type { ObjectLinkDto, ProjectDto, UmlAssociationDto } from '../../../api/dtos';
import { objectModelApi } from '../../../api';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import {
  PropertySection,
  PropertyTextField,
} from '../../class-diagram/properties/ClassPropertiesPanel';
import { updateObjectLinkEnd } from '../objectDiagramUpdates';

interface ObjectAssociationPropertiesPanelProps {
  project: ProjectDto;
  link: ObjectLinkDto;
  onProjectChange: (project: ProjectDto) => void;
}

export function ObjectAssociationPropertiesPanel({
  project,
  link,
  onProjectChange,
}: ObjectAssociationPropertiesPanelProps) {
  const association = project.umlModel.associations.find(
    (candidate) => candidate.id === link.associationId,
  );
  const [sourceEnd, targetEnd] = association?.ends ?? [];

  return (
    <div className="properties-content">
      <h3>Object Association Properties</h3>
      <PropertyTextField label="Link ID" value={link.id} readOnly />
      <PropertyTextField
        label="Association"
        value={association?.name ?? link.associationId}
        readOnly
      />
      <DeleteActionButton
        label="Delete Link"
        confirmMessage={`Delete object link "${link.id}"? Related validation markers will be cleared from the UI.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => objectModelApi.deleteObjectLink(project.project.id, link.id),
            onProjectChange,
            successMessage: `Object link "${link.id}" deleted.`,
          }).then(() => undefined)
        }
      />

      {!association || !sourceEnd || !targetEnd ? (
        <p className="property-field-error">
          The referenced association could not be resolved.
        </p>
      ) : (
        <>
          <PropertySection title="Source Object">
            <ObjectEndSelect
              project={project}
              link={link}
              association={association}
              associationEndId={sourceEnd.id}
              roleName={sourceEnd.roleName}
              expectedClassId={sourceEnd.classId}
              onProjectChange={onProjectChange}
            />
          </PropertySection>
          <PropertySection title="Target Object">
            <ObjectEndSelect
              project={project}
              link={link}
              association={association}
              associationEndId={targetEnd.id}
              roleName={targetEnd.roleName}
              expectedClassId={targetEnd.classId}
              onProjectChange={onProjectChange}
            />
          </PropertySection>
        </>
      )}
    </div>
  );
}

function ObjectEndSelect({
  project,
  link,
  association,
  associationEndId,
  roleName,
  expectedClassId,
  onProjectChange,
}: {
  project: ProjectDto;
  link: ObjectLinkDto;
  association: UmlAssociationDto;
  associationEndId: string;
  roleName: string;
  expectedClassId: string;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const currentObjectId =
    link.endValues.find((endValue) => endValue.associationEndId === associationEndId)
      ?.objectId ?? '';
  const expectedClass = project.umlModel.classes.find(
    (candidate) => candidate.id === expectedClassId,
  );
  const matchingObjects = project.objectModel.objects.filter(
    (object) => object.classId === expectedClassId,
  );

  return (
    <>
      <PropertyTextField label="Role" value={roleName || '<unnamed>'} readOnly />
      <PropertyTextField
        label="Expected Type"
        value={expectedClass?.name ?? expectedClassId}
        readOnly
      />
      <label className="property-field">
        <span>Object</span>
        <select
          value={currentObjectId}
          aria-invalid={currentObjectId ? undefined : true}
          onChange={(event) =>
            syncProjectChange({
              projectId: project.project.id,
              nextProject: updateObjectLinkEnd(
                project,
                link.id,
                associationEndId,
                event.target.value,
              ),
              onProjectChange,
              successMessage: `Object link "${link.id}" saved.`,
            })
          }
        >
          <option value="">Select object</option>
          {matchingObjects.map((object) => (
            <option key={object.id} value={object.id}>
              {object.name}
            </option>
          ))}
        </select>
        {currentObjectId ? null : (
          <small className="property-field-error">
            Select a {expectedClass?.name ?? 'matching'} object for {association.name}.
          </small>
        )}
      </label>
    </>
  );
}
