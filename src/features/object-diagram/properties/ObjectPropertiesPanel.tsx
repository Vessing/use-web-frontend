import { useEffect, useMemo, useState } from 'react';

import type {
  ObjectInstanceDto,
  ObjectLinkDto,
  ProjectDto,
  UmlAttributeDto,
  UmlAssociationDto,
  ProjectReadModelDto,
  ValueProjectionDto,
} from '../../../api/dtos';
import { ApiClientError, objectModelApi, snapshotCommandApi } from '../../../api';
import { DeleteActionButton } from '../../../components/DeleteActionButton';
import { appStoreActions } from '../../../state';
import { deleteProjectElementAndSync } from '../../delete/projectDeletion';
import { syncProjectChange } from '../../project-sync/syncProjectChange';
import {
  PropertySection,
  PropertyTextField,
} from '../../class-diagram/properties/ClassPropertiesPanel';
import { updateObject } from '../objectDiagramUpdates';
import { OperationInvocationPanel } from './OperationInvocationPanel';
import { TypeDirectedValueEditor } from './TypeDirectedValueEditor';

interface ObjectPropertiesPanelProps {
  project: ProjectDto;
  object: ObjectInstanceDto;
  onProjectChange: (project: ProjectDto) => void;
  readModel?: ProjectReadModelDto | null;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
}

export function ObjectPropertiesPanel({
  project,
  object,
  onProjectChange,
  readModel,
  readVersion,
  onRefreshProject,
}: ObjectPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'object' | 'associations' | 'operations'>('object');
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
        <button
          type="button"
          className={activeTab === 'operations' ? 'active' : undefined}
          role="tab"
          aria-selected={activeTab === 'operations'}
          onClick={() => setActiveTab('operations')}
        >
          Operations
        </button>
      </div>

      {activeTab === 'object' ? (
        <ObjectGeneralProperties
          project={project}
          object={object}
          umlClass={umlClass}
          nameError={nameError}
          readModel={readModel}
          readVersion={readVersion}
          onRefreshProject={onRefreshProject}
          onProjectChange={onProjectChange}
        />
      ) : null}

      {activeTab === 'associations' ? (
        <ObjectAssociationAccess
          project={project}
          object={object}
          links={relatedLinks}
          possibleAssociations={possibleAssociations}
        />
      ) : null}

      {activeTab === 'operations' ? (
        <OperationInvocationPanel
          project={project}
          object={object}
          readModel={readModel}
          readVersion={readVersion}
          onRefreshProject={onRefreshProject}
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
  readModel,
  onProjectChange,
  readVersion,
  onRefreshProject,
}: Pick<
  ObjectPropertiesPanelProps,
  'project' | 'object' | 'onProjectChange' | 'readVersion' | 'onRefreshProject'
> & {
  umlClass: ReturnType<typeof findClass>;
  nameError: string | null;
  readModel?: ProjectReadModelDto | null;
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
        ) : effectiveObjectAttributeGroups(project, umlClass.id).length === 0 ? (
          <p className="property-empty">No attributes defined for this class.</p>
        ) : (
          effectiveObjectAttributeGroups(project, umlClass.id).map((group) => (
            <section className="object-attribute-group" key={group.owner.id}>
              <h4>{group.owner.id === umlClass.id ? `Attributes of ${group.owner.name}` : `Inherited from ${group.owner.name}`}</h4>
              {group.attributes.map((attribute) => (
              <SlotValueEditor
                key={attribute.id}
                project={project}
                object={object}
                attribute={attribute}
                readModel={readModel}
                readVersion={readVersion}
                onRefreshProject={onRefreshProject}
                onProjectChange={onProjectChange}
              />
              ))}
            </section>
          ))
        )}
      </PropertySection>
    </>
  );
}

function effectiveObjectAttributeGroups(project: ProjectDto, classId: string, visited = new Set<string>()): Array<{
  owner: ProjectDto['umlModel']['classes'][number];
  attributes: ProjectDto['umlModel']['classes'][number]['attributes'];
}> {
  if (visited.has(classId)) return [];
  visited.add(classId);
  const owner = project.umlModel.classes.find((candidate) => candidate.id === classId);
  if (!owner) return [];
  return [
    ...(owner.superClassIds ?? []).flatMap((superclassId) =>
      effectiveObjectAttributeGroups(project, superclassId, visited)),
    ...(owner.attributes.filter((attribute) => !attribute.staticAttribute).length
      ? [{ owner, attributes: owner.attributes.filter((attribute) => !attribute.staticAttribute) }]
      : []),
  ];
}

function ObjectAssociationAccess({
  project,
  object,
  links,
  possibleAssociations,
}: {
  project: ProjectDto;
  object: ObjectInstanceDto;
  links: ObjectLinkDto[];
  possibleAssociations: UmlAssociationDto[];
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
        <p className="property-empty">No class associations are available for this object type.</p>
      ) : null}

      {links.length === 0 ? (
        <p className="property-empty">No object links reference this object.</p>
      ) : (
        <div className="property-related-list">
          {links.map((link) => (
            <EditableObjectAssociationSummary key={link.id} project={project} link={link} />
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function EditableObjectAssociationSummary({
  project,
  link,
}: {
  project: ProjectDto;
  link: ObjectLinkDto;
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
      <span className="property-related-hint">
        Select the link to edit assignments or inspect delete impact.
      </span>
    </div>
  );
}

interface SlotValueEditorProps {
  project: ProjectDto;
  object: ObjectInstanceDto;
  attribute: UmlAttributeDto;
  readModel?: ProjectReadModelDto | null;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
  onProjectChange: (project: ProjectDto) => void;
}

function SlotValueEditor({
  project,
  object,
  attribute,
  readModel,
  readVersion,
  onRefreshProject,
}: SlotValueEditorProps) {
  const projected = readModel?.objects
    ?.find((candidate) => candidate.id === object.id)
    ?.slots.find((candidate) => candidate.attributeId === attribute.id);
  const slot = object.slots.find((candidate) => candidate.attributeId === attribute.id);
  const [draftValue, setDraftValue] = useState<unknown>(slot?.value ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fieldPath, setFieldPath] = useState<string | null>(null);
  useEffect(() => {
    setDraftValue(slot?.value ?? null);
    setMessage(null);
    setFieldPath(null);
  }, [slot?.id, slot?.value]);

  if (attribute.derived || projected?.derived) {
    const status = projected?.valueStatus ?? projected?.value?.status ?? 'INVALID';
    const rendered =
      status === 'NULL'
        ? 'null'
        : status === 'INVALID'
          ? 'invalid'
          : formatProjectedValue(projected?.value);
    return (
      <div className="derived-slot-value" aria-label={`${attribute.name} derived value`}>
        <span>
          <strong>
            /{attribute.name} : {attribute.type}
          </strong>
          <small>Calculated from the current snapshot · read-only</small>
        </span>
        <output className={`value-status value-status-${status.toLowerCase()}`}>{rendered}</output>
        {projected?.diagnostics.map((diagnostic) => (
          <small className="property-field-error" key={diagnostic.id}>
            {diagnostic.userMessage ?? diagnostic.message}
          </small>
        ))}
      </div>
    );
  }

  const slotId = slot?.id ?? `slot-${attribute.id}`;
  const save = async () => {
    if (!readVersion || busy) return;
    setBusy(true);
    setMessage(null);
    setFieldPath(null);
    try {
      const result = await snapshotCommandApi.updateSlot(project.project.id, object.id, slotId, {
        expectedRevision: readVersion,
        draft: {
          id: slotId,
          attributeId: attribute.id,
          value: { type: attribute.type, value: draftValue },
          valueType: attribute.type,
          isUnset: draftValue === null,
        },
      });
      if (!(await onRefreshProject()))
        throw new Error('The authoritative slot projection could not be reloaded.');
      setMessage({ kind: 'success', text: `Saved at snapshot revision ${result.revision}.` });
    } catch (error) {
      if (error instanceof ApiClientError)
        setFieldPath(
          typeof error.dto.details?.fieldPath === 'string' ? error.dto.details.fieldPath : null,
        );
      setMessage({
        kind: 'error',
        text:
          error instanceof ApiClientError
            ? `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`
            : error instanceof Error
              ? error.message
              : 'The slot command failed.',
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="slot-value-command-editor" aria-busy={busy}>
      <TypeDirectedValueEditor
        project={project}
        type={attribute.type}
        value={draftValue}
        label={attribute.name}
        errorPath={fieldPath}
        onChange={(value) => {
          setDraftValue(value);
          setMessage(null);
          setFieldPath(null);
          appStoreActions.markValidationStale();
        }}
      />
      {projected?.inherited ? (
        <small>Inherited from {projected.definingClassifier.name}</small>
      ) : null}
      {message ? (
        <p
          className={`properties-message properties-message-${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
      <div className="properties-actions">
        <button
          type="button"
          disabled={busy || Object.is(draftValue, slot?.value)}
          onClick={() => setDraftValue(slot?.value ?? null)}
        >
          Discard
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy || !readVersion || Object.is(draftValue, slot?.value)}
          onClick={() => void save()}
        >
          {busy ? 'Saving...' : 'Save Value'}
        </button>
      </div>
    </div>
  );
}

function formatProjectedValue(value: ValueProjectionDto | null | undefined): string {
  if (!value) return 'invalid';
  if (value.scalar !== undefined && value.scalar !== null) return String(value.scalar);
  if (value.elements)
    return `[${value.elements.map((item) => formatProjectedValue(item)).join(', ')}]`;
  if (value.fields)
    return `{ ${Object.entries(value.fields)
      .map(([name, item]) => `${name}: ${formatProjectedValue(item)}`)
      .join(', ')} }`;
  return value.status === 'NULL' ? 'null' : value.status === 'INVALID' ? 'invalid' : '';
}

function findClass(project: ProjectDto, classId: string) {
  return project.umlModel.classes.find((candidate) => candidate.id === classId);
}

function openAddAssociationForObject(object: ObjectInstanceDto, association: UmlAssociationDto) {
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
        link.endValues.find((endValue) => endValue.associationEndId === end.id)?.objectId ?? '';
      const linkedObject = project.objectModel.objects.find(
        (candidate) => candidate.id === linkedObjectId,
      );
      const role = end.roleName ? `${end.roleName}: ` : '';

      return `${role}${linkedObject?.name ?? (linkedObjectId || '<missing>')}`;
    })
    .join(' - ');
}
