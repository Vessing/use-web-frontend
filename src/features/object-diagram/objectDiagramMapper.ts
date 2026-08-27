import type {
  DiagramLayoutDto,
  Id,
  ObjectInstanceDto,
  ObjectLinkDto,
  ProjectDto,
  UmlAssociationDto,
  UmlClassDto,
} from '../../api/dtos';
import type { SelectionState, ValidationMarker } from '../../state';
import {
  formatMultiplicity,
  summarizeValidationMarkers,
  type DiagramEdge,
  type DiagramNode,
} from '../diagram-core';

export interface ObjectDiagramElements {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type ValidationMarkersByElementId = Record<Id, ValidationMarker[]>;

const fallbackSpacing = {
  x: 360,
  y: 220,
};

export function mapProjectToObjectDiagram(
  project: ProjectDto,
  markersByElementId: ValidationMarkersByElementId = {},
  selection: SelectionState = null,
  layoutOverride?: DiagramLayoutDto,
): ObjectDiagramElements {
  const layoutByElementId = createLayoutByElementId(
    project.layout.objectDiagram,
    layoutOverride,
  );
  const classesById = new Map(project.umlModel.classes.map((umlClass) => [umlClass.id, umlClass]));
  const objectsById = new Map(project.objectModel.objects.map((object) => [object.id, object]));
  const associationsById = new Map(
    project.umlModel.associations.map((association) => [association.id, association]),
  );

  return {
    nodes: project.objectModel.objects.map((object, index) =>
      mapObjectNode(
        object,
        classesById.get(object.classId),
        layoutByElementId.get(object.id),
        markersByElementId,
        selection,
        index,
      ),
    ),
    edges: project.objectModel.links.flatMap((link) =>
      mapObjectLinkEdge(
        link,
        associationsById.get(link.associationId),
        objectsById,
        markersByElementId,
        selection,
      ),
    ),
  };
}

function createLayoutByElementId(
  projectLayout: DiagramLayoutDto,
  layoutOverride?: DiagramLayoutDto,
) {
  return new Map(
    [...projectLayout.nodes, ...(layoutOverride?.nodes ?? [])].map((node) => [
      node.elementId,
      node,
    ]),
  );
}

function mapObjectNode(
  object: ObjectInstanceDto,
  umlClass: UmlClassDto | undefined,
  layout: DiagramLayoutDto['nodes'][number] | undefined,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
  index: number,
): DiagramNode {
  const validationSummary = summarizeValidationMarkers(markersByElementId[object.id]);

  return {
    id: object.id,
    type: 'objectNode',
    position: {
      x: layout?.x ?? 140 + (index % 3) * fallbackSpacing.x,
      y: layout?.y ?? 120 + Math.floor(index / 3) * fallbackSpacing.y,
    },
    selected:
      selection?.view === 'object-diagram' &&
      selection.type === 'object' &&
      selection.id === object.id,
    data: {
      ref: { elementType: 'object', elementId: object.id },
      name: object.displayName ?? object.name,
      className: umlClass?.name ?? object.classId,
      slots: formatSlots(object, umlClass),
      ...validationSummary,
    },
  };
}

function mapObjectLinkEdge(
  link: ObjectLinkDto,
  association: UmlAssociationDto | undefined,
  objectsById: Map<Id, ObjectInstanceDto>,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
): DiagramEdge[] {
  if (!association) {
    return [];
  }

  const [sourceEnd, targetEnd] = association.ends;

  if (!sourceEnd || !targetEnd) {
    return [];
  }

  const sourceObjectId = findObjectIdForEnd(link, sourceEnd.id);
  const targetObjectId = findObjectIdForEnd(link, targetEnd.id);

  if (!sourceObjectId || !targetObjectId) {
    return [];
  }

  if (!objectsById.has(sourceObjectId) || !objectsById.has(targetObjectId)) {
    return [];
  }

  const validationSummary = summarizeValidationMarkers([
    ...(markersByElementId[link.id] ?? []),
    ...(markersByElementId[link.associationId] ?? []),
  ]);

  return [
    {
      id: link.id,
      type: 'objectLink',
      source: sourceObjectId,
      target: targetObjectId,
      selected:
        selection?.view === 'object-diagram' &&
        selection.type === 'objectLink' &&
        selection.id === link.id,
      data: {
        ref: { elementType: 'objectLink', elementId: link.id },
        associationName: link.name?.trim() || association.name,
        sourceEnd: {
          roleName: sourceEnd.roleName,
          multiplicity: formatMultiplicity(sourceEnd.multiplicity),
        },
        targetEnd: {
          roleName: targetEnd.roleName,
          multiplicity: formatMultiplicity(targetEnd.multiplicity),
        },
        ...validationSummary,
      },
    },
  ];
}

function formatSlots(object: ObjectInstanceDto, umlClass: UmlClassDto | undefined): string[] {
  if (!umlClass) {
    return object.slots.map((slot) => `${slot.attributeId} = ${formatSlotValue(slot.value)}`);
  }

  return umlClass.attributes.map((attribute) => {
    const slot = object.slots.find((candidate) => candidate.attributeId === attribute.id);
    const value = slot?.isUnset ? '<unset>' : formatSlotValue(slot?.value ?? null);

    return `${attribute.name} = ${value}`;
  });
}

function formatSlotValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<unset>';
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function findObjectIdForEnd(link: ObjectLinkDto, associationEndId: Id) {
  return link.endValues.find((endValue) => endValue.associationEndId === associationEndId)
    ?.objectId;
}
