import { useMemo, useState } from 'react';

import type {
  ObjectInstanceDto,
  ObjectLinkDto,
  ProjectDto,
  UmlAttributeDto,
  UmlAssociationDto,
  UmlTypeDto,
} from '../../../api/dtos';
import { objectModelApi } from '../../../api';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { appStoreActions } from '../../../state';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import {
  PropertySection,
  PropertyTextField,
} from '../../class-diagram/properties/ClassPropertiesPanel';
import { updateObject, updateSlotValueByAttribute } from '../objectDiagramUpdates';

interface ObjectPropertiesPanelProps {
  project: ProjectDto;
  object: ObjectInstanceDto;
  onProjectChange: (project: ProjectDto) => void;
}

export function ObjectPropertiesPanel({
  project,
  object,
  onProjectChange,
}: ObjectPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'object' | 'associations'>('object');
  const umlClass = findClass(project, object.classId);
  const nameError = object.name.trim() ? null : 'Object name is required.';
  const relatedLinks = useMemo(
    () =>
      project.objectModel.links.filter((link) =>
        link.endValues.some((endValue) => endValue.objectId === object.id),
      ),
    [project.objectModel.links, object.id],
  );
  const possibleAssociations = useMemo(
    () =>
      project.umlModel.associations.filter((association) =>
        association.ends.some((end) => end.classId === object.classId),
      ),
    [project.umlModel.associations, object.classId],
  );

  return (
    <div className="properties-content">
      <h3>Object Properties</h3>

      <div
        className="properties-segmented-control properties-segmented-control-compact"
        role="tablist"
        aria-label="Object properties"
      >
        <button
          type="button"
          className={activeTab === 'object' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'object'}
          onClick={() => setActiveTab('object')}
        >
          Object
        </button>
        <button
          type="button"
          className={activeTab === 'associations' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'associations'}
          onClick={() => setActiveTab('associations')}
        >
          Associations
        </button>
      </div>

      {activeTab === 'object' ? (
        <ObjectGeneralProperties
          project={project}
          object={object}
          umlClass={umlClass}
          nameError={nameError}
          onProjectChange={onProjectChange}
        />
      ) : null}

      {activeTab === 'associations' ? (
        <ObjectAssociationAccess
          project={project}
          object={object}
          links={relatedLinks}
          possibleAssociations={possibleAssociations}
          onProjectChange={onProjectChange}
        />
      ) : null}
    </div>
  );
}

function ObjectGeneralProperties({
  project,
  object,
  umlClass,
  nameError,
  onProjectChange,
}: ObjectPropertiesPanelProps & {
  umlClass: ReturnType<typeof findClass>;
  nameError: string | null;
}) {
  return (
    <>
      <PropertyTextField
        label="Object Name"
        value={object.name}
        error={nameError}
        onChange={(name) => {
          onProjectChange(updateObject(project, object.id, { name }));
          appStoreActions.markValidationStale();
        }}
        onCommit={(name) =>
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateObject(project, object.id, { name }),
            onProjectChange,
            successMessage: `Object "${name}" saved.`,
          })
        }
      />
      <DeleteActionButton
        label="Delete Object"
        confirmMessage={`Delete object "${object.name}"? Connected object links, layout entries and validation markers may be removed by the backend.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => objectModelApi.deleteObject(project.project.id, object.id),
            onProjectChange,
            successMessage: `Object "${object.name}" deleted.`,
          }).then(() => undefined)
        }
      />
      <label className="property-field">
        <span>Type</span>
        <select
          value={object.classId}
          onChange={(event) =>
            syncProjectChange({
              projectId: project.project.id,
              nextProject: updateObject(project, object.id, { classId: event.target.value }),
              onProjectChange,
              successMessage: `Object "${object.name}" saved.`,
            })
          }
        >
          {project.umlModel.classes.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </label>

      <PropertySection title="Slots">
        {!umlClass ? (
          <p className="property-empty">The referenced class could not be resolved.</p>
        ) : umlClass.attributes.length === 0 ? (
          <p className="property-empty">No attributes defined for this class.</p>
        ) : (
          umlClass.attributes.map((attribute) => (
            <SlotValueEditor
              key={attribute.id}
              project={project}
              object={object}
              attribute={attribute}
              onProjectChange={onProjectChange}
            />
          ))
        )}
      </PropertySection>
    </>
  );
}

function ObjectAssociationAccess({
  project,
  object,
  links,
  possibleAssociations,
  onProjectChange,
}: {
  project: ProjectDto;
  object: ObjectInstanceDto;
  links: ObjectLinkDto[];
  possibleAssociations: UmlAssociationDto[];
  onProjectChange: (project: ProjectDto) => void;
}) {
  return (
    <PropertySection
      title="Object Associations"
      actionLabel={possibleAssociations.length > 0 ? 'Add Association' : undefined}
      onAction={
        possibleAssociations.length > 0
          ? () => openAddAssociationForObject(object, possibleAssociations[0])
          : undefined
      }
    >
      {possibleAssociations.length === 0 ? (
        <p className="property-empty">
          No class associations are available for this object type.
        </p>
      ) : null}

      {links.length === 0 ? (
        <p className="property-empty">No object links reference this object.</p>
      ) : (
        <div className="property-related-list">
          {links.map((link) => (
            <EditableObjectAssociationSummary
              key={link.id}
              project={project}
              object={object}
              link={link}
              onProjectChange={onProjectChange}
            />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function EditableObjectAssociationSummary({
  project,
  object,
  link,
  onProjectChange,
}: {
  project: ProjectDto;
  object: ObjectInstanceDto;
  link: ObjectLinkDto;
  onProjectChange: (project: ProjectDto) => void;
}) {
  const association = project.umlModel.associations.find(
    (candidate) => candidate.id === link.associationId,
  );

  return (
    <div className="property-related-editor">
      <button
        type="button"
        className="property-related-item"
        onClick={() =>
          appStoreActions.select({
            view: 'object-diagram',
            type: 'objectLink',
            id: link.id,
          })
        }
      >
        <strong>{association?.name ?? link.associationId}</strong>
        <span>{formatObjectLinkSummary(project, link)}</span>
      </button>
      <DeleteActionButton
        label="Delete Link"
        confirmMessage={`Delete object link "${formatObjectLinkSummary(project, link)}"? Related validation markers will be cleared from the UI.`}
        onDelete={() =>
          deleteProjectElementAndSync({
            project,
            deleteRequest: () => objectModelApi.deleteObjectLink(project.project.id, link.id),
            onProjectChange,
            successMessage: `Object link for "${object.name}" deleted.`,
          }).then(() => undefined)
        }
      />
    </div>
  );
}

interface SlotValueEditorProps {
  project: ProjectDto;
  object: ObjectInstanceDto;
  attribute: UmlAttributeDto;
  onProjectChange: (project: ProjectDto) => void;
}

function SlotValueEditor({
  project,
  object,
  attribute,
  onProjectChange,
}: SlotValueEditorProps) {
  const slot = object.slots.find((candidate) => candidate.attributeId === attribute.id);
  const stringValue =
    slot?.value === null || slot?.value === undefined ? '' : String(slot.value);
  const typeError = validateSlotValue(attribute.type, stringValue);

  if (attribute.type === 'Boolean') {
    return (
      <label className="property-field">
        <span>{attribute.name}</span>
        <select
          value={slot?.value === true ? 'true' : slot?.value === false ? 'false' : ''}
          onChange={(event) => {
            const nextValue =
              event.target.value === '' ? null : event.target.value === 'true';
            syncProjectChange({
              projectId: project.project.id,
              nextProject: updateSlotValueByAttribute(project, object.id, attribute, {
                value: nextValue,
                valueType: attribute.type,
                isUnset: event.target.value === '',
              }),
              onProjectChange,
              successMessage: `Slot "${attribute.name}" saved.`,
            });
          }}
        >
          <option value="">Unset</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
    );
  }

  return (
    <PropertyTextField
      label={`${attribute.name} : ${attribute.type}`}
      value={stringValue}
      error={typeError}
      onChange={(value) => {
        const parsedValue = parseSlotValue(attribute.type, value);

        if (parsedValue.isValid) {
          onProjectChange(
            updateSlotValueByAttribute(project, object.id, attribute, {
              value: parsedValue.value,
              valueType: attribute.type,
              isUnset: value.trim().length === 0,
            }),
          );
          appStoreActions.markValidationStale();
        }
      }}
      onCommit={(value) => {
        const parsedValue = parseSlotValue(attribute.type, value);

        if (parsedValue.isValid) {
          syncProjectChange({
            projectId: project.project.id,
            nextProject: updateSlotValueByAttribute(project, object.id, attribute, {
              value: parsedValue.value,
              valueType: attribute.type,
              isUnset: value.trim().length === 0,
            }),
            onProjectChange,
            successMessage: `Slot "${attribute.name}" saved.`,
          });
        }
      }}
    />
  );
}

function parseSlotValue(type: UmlTypeDto, rawValue: string) {
  if (rawValue.trim().length === 0) {
    return { isValid: true, value: null };
  }

  if (type === 'Integer') {
    if (!/^-?\d+$/.test(rawValue.trim())) {
      return { isValid: false, value: rawValue };
    }

    return { isValid: true, value: Number(rawValue) };
  }

  if (type === 'Real') {
    const value = Number(rawValue);
    return { isValid: Number.isFinite(value), value };
  }

  return { isValid: true, value: rawValue };
}

function validateSlotValue(type: UmlTypeDto, rawValue: string) {
  if (rawValue.trim().length === 0) {
    return null;
  }

  if (type === 'Integer' && !/^-?\d+$/.test(rawValue.trim())) {
    return 'Enter an integer value.';
  }

  if (type === 'Real' && !Number.isFinite(Number(rawValue))) {
    return 'Enter a numeric value.';
  }

  return null;
}

function findClass(project: ProjectDto, classId: string) {
  return project.umlModel.classes.find((candidate) => candidate.id === classId);
}

function openAddAssociationForObject(
  object: ObjectInstanceDto,
  association: UmlAssociationDto,
) {
  const [sourceEnd, targetEnd] = association.ends;

  appStoreActions.openModal({
    type: 'addObjectAssociation',
    associationId: association.id,
    sourceObjectId: sourceEnd?.classId === object.classId ? object.id : undefined,
    targetObjectId: targetEnd?.classId === object.classId ? object.id : undefined,
  });
}

function formatObjectLinkSummary(project: ProjectDto, link: ObjectLinkDto) {
  const association = project.umlModel.associations.find(
    (candidate) => candidate.id === link.associationId,
  );

  if (!association) {
    return link.id;
  }

  return association.ends
    .map((end) => {
      const linkedObjectId =
        link.endValues.find((endValue) => endValue.associationEndId === end.id)
          ?.objectId ?? '';
      const linkedObject = project.objectModel.objects.find(
        (candidate) => candidate.id === linkedObjectId,
      );
      const role = end.roleName ? `${end.roleName}: ` : '';

      return `${role}${linkedObject?.name ?? (linkedObjectId || '<missing>')}`;
    })
    .join(' - ');
}
