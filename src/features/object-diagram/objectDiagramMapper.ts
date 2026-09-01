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
  const associationClassLinkByObjectId = new Map(project.objectModel.links.flatMap((link) => link.associationClassObjectId ? [[link.associationClassObjectId, link] as const] : []));
  const objectNodes = project.objectModel.objects.map((object, index) =>
    mapObjectNode(
      object,
      classesById.get(object.classId),
      layoutByElementId.get(object.id),
      markersByElementId,
      selection,
      index,
      associationClassLinkByObjectId.get(object.id),
    ),
  );
  const hubLinks = project.objectModel.links.filter(
    (link) => (associationsById.get(link.associationId)?.ends.length ?? 0) > 2 || Boolean(link.associationClassObjectId),
  );

  return {
    nodes: [
      ...objectNodes,
      ...hubLinks.map((link) => ({
        id: `nary-link:${link.id}`,
        type: 'naryHub' as const,
        position: centerOfNodes(
          objectNodes.filter((node) => link.endValues.some((end) => end.objectId === node.id)),
        ),
        selected:
          selection?.view === 'object-diagram' &&
          selection.type === 'objectLink' &&
          selection.id === link.id,
        data: {
          ref: { elementType: 'objectLink' as const, elementId: link.id },
          name: link.name?.trim() || associationsById.get(link.associationId)?.name || 'Object Link',
          participantCount: link.endValues.length,
        },
      })),
    ],
    edges: [
      ...project.objectModel.links.flatMap((link) => mapObjectLinkEdge(
        link,
        associationsById.get(link.associationId),
        objectsById,
        markersByElementId,
        selection,
      )),
      ...project.objectModel.links.flatMap((link) => link.associationClassObjectId && objectsById.has(link.associationClassObjectId) ? [{
        id: `association-class-object:${link.id}`,
        type: 'semanticConnector' as const,
        source: `nary-link:${link.id}`,
        target: link.associationClassObjectId,
        selectable: false,
        data: {
          ref: { elementType: 'objectLink' as const, elementId: link.id },
          label: 'shared identity',
        },
      }] : []),
    ],
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
  associationClassLink?: ObjectLinkDto,
): DiagramNode {
  const validationSummary = summarizeValidationMarkers(markersByElementId[object.id]);

  return {
    id: object.id,
    type: 'objectNode',
    position: {
      x: layout?.x ?? 140 + (index % 3) * fallbackSpacing.x,
      y: layout?.y ?? 120 + Math.floor(index / 3) * fallbackSpacing.y,
    },
    selected: Boolean(
      selection?.view === 'object-diagram' &&
      ((selection.type === 'object' && selection.id === object.id) ||
        (associationClassLink && selection.type === 'objectLink' && selection.id === associationClassLink.id)),
    ),
    data: {
      ref: associationClassLink
        ? { elementType: 'objectLink', elementId: associationClassLink.id }
        : { elementType: 'object', elementId: object.id },
      name: object.displayName ?? object.name,
      className: umlClass?.name ?? object.classId,
      associationClass: Boolean(associationClassLink),
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

  if (association.ends.length > 2 || link.associationClassObjectId) {
    return association.ends.flatMap((end) => {
      const objectId = findObjectIdForEnd(link, end.id);
      if (!objectId || !objectsById.has(objectId)) return [];
      return [{
        id: `${link.id}:${end.id}`,
        type: 'narySegment' as const,
        source: `nary-link:${link.id}`,
        target: objectId,
        selectable: false,
        data: {
          ref: { elementType: 'objectLink' as const, elementId: link.id },
          endLabel: {
            roleName: end.roleName,
            multiplicity: formatMultiplicity(end.multiplicity),
            aggregationKind: end.aggregationKind ?? 'NONE',
          },
          qualifierNames: (end.qualifiers ?? []).map((qualifier) => qualifier.name),
        },
      }];
    });
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
          aggregationKind: sourceEnd.aggregationKind ?? 'NONE',
        },
        targetEnd: {
          roleName: targetEnd.roleName,
          multiplicity: formatMultiplicity(targetEnd.multiplicity),
          aggregationKind: targetEnd.aggregationKind ?? 'NONE',
        },
        ...validationSummary,
      },
    },
  ];
}

function centerOfNodes(nodes: DiagramNode[]) {
  if (!nodes.length) return { x: 500, y: 300 };
  return {
    x: nodes.reduce((sum, node) => sum + node.position.x, 0) / nodes.length + 90,
    y: nodes.reduce((sum, node) => sum + node.position.y, 0) / nodes.length + 70,
  };
}

function formatSlots(object: ObjectInstanceDto, umlClass: UmlClassDto | undefined): string[] {
  if (!umlClass) {
    return object.slots.map((slot) =>
      `${slot.attributeId} = ${slot.isUnset ? '<unset>' : formatSlotValue(slot.value)}`,
    );
  }

  return umlClass.attributes.map((attribute) => {
    const slot = object.slots.find((candidate) => candidate.attributeId === attribute.id);
    const value = !slot || slot.isUnset ? '<unset>' : formatSlotValue(slot.value);

    return `${attribute.name} = ${value}`;
  });
}

function formatSlotValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return '<unset>';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatSlotValue).join(', ')}]`;
  }

  if (typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([name, member]) => `${name} = ${formatSlotValue(member)}`)
      .join(', ')} }`;
  }

  return String(value);
}

function findObjectIdForEnd(link: ObjectLinkDto, associationEndId: Id) {
  return link.endValues.find((endValue) => endValue.associationEndId === associationEndId)
    ?.objectId;
}
