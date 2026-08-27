import type {
  DiagramLayoutDto,
  Id,
  ProjectDto,
  UmlAssociationDto,
  UmlClassDto,
  UmlInvariantDto,
  UmlOperationDto,
} from '../../api/dtos';
import type { SelectionState, ValidationMarker } from '../../state';
import {
  formatMultiplicity,
  summarizeValidationMarkers,
  type DiagramEdge,
  type DiagramNode,
} from '../diagram-core';

export interface ClassDiagramElements {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type ValidationMarkersByElementId = Record<Id, ValidationMarker[]>;

const fallbackSpacing = {
  x: 340,
  y: 220,
};

export function mapProjectToClassDiagram(
  project: ProjectDto,
  markersByElementId: ValidationMarkersByElementId = {},
  selection: SelectionState = null,
  layoutOverride?: DiagramLayoutDto,
): ClassDiagramElements {
  const layoutByElementId = createLayoutByElementId(
    project.layout.classDiagram,
    layoutOverride,
  );
  const invariantsByClassId = groupInvariantsByClassId(project.umlModel.invariants);
  const classIds = new Set(project.umlModel.classes.map((umlClass) => umlClass.id));

  return {
    nodes: project.umlModel.classes.map((umlClass, index) =>
      mapClassNode(
        umlClass,
        invariantsByClassId.get(umlClass.id) ?? [],
        layoutByElementId.get(umlClass.id),
        markersByElementId,
        selection,
        index,
      ),
    ),
    edges: project.umlModel.associations.flatMap((association) =>
      mapAssociationEdge(association, classIds, markersByElementId, selection),
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

function mapClassNode(
  umlClass: UmlClassDto,
  invariants: UmlInvariantDto[],
  layout: DiagramLayoutDto['nodes'][number] | undefined,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
  index: number,
): DiagramNode {
  const validationSummary = summarizeValidationMarkers(markersByElementId[umlClass.id]);

  return {
    id: umlClass.id,
    type: 'umlClass',
    position: {
      x: layout?.x ?? 120 + (index % 3) * fallbackSpacing.x,
      y: layout?.y ?? 120 + Math.floor(index / 3) * fallbackSpacing.y,
    },
    selected:
      selection?.view === 'class-diagram' &&
      selection.type === 'class' &&
      selection.id === umlClass.id,
    data: {
      ref: { elementType: 'class', elementId: umlClass.id },
      name: umlClass.name,
      attributes: umlClass.attributes.map(
        (attribute) => `${attribute.name} : ${attribute.type}`,
      ),
      operations: umlClass.operations.map(formatOperation),
      invariants: invariants.map((invariant) => ({
        id: invariant.id,
        label: `inv: ${invariant.name}`,
        selected:
          selection?.view === 'class-diagram' &&
          selection.type === 'invariant' &&
          selection.id === invariant.id,
        ...summarizeValidationMarkers(markersByElementId[invariant.id]),
      })),
      ...validationSummary,
    },
  };
}

function mapAssociationEdge(
  association: UmlAssociationDto,
  classIds: Set<Id>,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
): DiagramEdge[] {
  const [sourceEnd, targetEnd] = association.ends;

  if (!sourceEnd || !targetEnd) {
    return [];
  }

  if (!classIds.has(sourceEnd.classId) || !classIds.has(targetEnd.classId)) {
    return [];
  }

  return [
    {
      id: association.id,
      type: 'umlAssociation',
      source: sourceEnd.classId,
      target: targetEnd.classId,
      selected:
        selection?.view === 'class-diagram' &&
        selection.type === 'association' &&
        selection.id === association.id,
      data: {
        ref: { elementType: 'association', elementId: association.id },
        associationName: association.name,
        sourceEnd: {
          roleName: sourceEnd.roleName,
          multiplicity: formatMultiplicity(sourceEnd.multiplicity),
        },
        targetEnd: {
          roleName: targetEnd.roleName,
          multiplicity: formatMultiplicity(targetEnd.multiplicity),
        },
        ...summarizeValidationMarkers(markersByElementId[association.id]),
      },
    },
  ];
}

function formatOperation(operation: UmlOperationDto): string {
  const parameters = operation.parameters
    .map((parameter) => `${parameter.name} : ${parameter.type}`)
    .join(', ');

  return `${operation.name}(${parameters}) : ${operation.returnType}`;
}

function groupInvariantsByClassId(invariants: UmlInvariantDto[]) {
  const result = new Map<Id, UmlInvariantDto[]>();

  for (const invariant of invariants) {
    result.set(invariant.contextClassId, [
      ...(result.get(invariant.contextClassId) ?? []),
      invariant,
    ]);
  }

  return result;
}
