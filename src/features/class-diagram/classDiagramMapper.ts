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
  const associationClassIds = new Set(project.umlModel.associations.flatMap((item) => item.associationClassId ? [item.associationClassId] : []));
  const classNodes = project.umlModel.classes.map((umlClass, index) =>
    mapClassNode(
      umlClass,
      invariantsByClassId.get(umlClass.id) ?? [],
      layoutByElementId.get(umlClass.id),
      markersByElementId,
      selection,
      index,
      associationClassIds.has(umlClass.id),
    ),
  );
  const hubAssociations = project.umlModel.associations.filter(
    (association) => association.ends.length > 2 || Boolean(association.associationClassId),
  );

  return {
    nodes: [
      ...classNodes,
      ...(project.umlModel.enumerations ?? []).map((item, index) => mapModelTypeNode(
        item,
        'enumeration',
        item.literals,
        classNodes.length + index,
        layoutByElementId.get(item.id),
        selection,
      )),
      ...(project.umlModel.dataTypes ?? []).map((item, index) => mapModelTypeNode(
        item,
        'dataType',
        item.properties.map((property) => `${property.name} : ${property.type}`),
        classNodes.length + (project.umlModel.enumerations ?? []).length + index,
        layoutByElementId.get(item.id),
        selection,
      )),
      ...hubAssociations.map((association) => ({
        id: `nary:${association.id}`,
        type: 'naryHub' as const,
        position: centerOfNodes(
          classNodes.filter((node) => association.ends.some((end) => end.classId === node.id)),
        ),
        selected:
          selection?.view === 'class-diagram' &&
          selection.type === 'association' &&
          selection.id === association.id,
        data: {
          ref: { elementType: 'association' as const, elementId: association.id },
          name: association.name,
          participantCount: association.ends.length,
        },
      })),
    ],
    edges: [
      ...project.umlModel.associations.flatMap((association) =>
        mapAssociationEdge(association, classIds, markersByElementId, selection),
      ),
      ...project.umlModel.associations.flatMap((association) => association.associationClassId && classIds.has(association.associationClassId) ? [{
        id: `association-class:${association.id}`,
        type: 'semanticConnector' as const,
        source: `nary:${association.id}`,
        target: association.associationClassId,
        selectable: false,
        data: {
          ref: { elementType: 'association' as const, elementId: association.id },
          label: 'association class',
        },
      }] : []),
      ...project.umlModel.classes.flatMap((umlClass) =>
        (umlClass.superClassIds ?? [])
          .filter((superClassId) => classIds.has(superClassId))
          .map((superClassId) => ({
            id: `generalization:${umlClass.id}:${superClassId}`,
            type: 'umlGeneralization' as const,
            source: umlClass.id,
            target: superClassId,
            selectable: false,
            data: {
              ref: {
                elementType: 'generalization' as const,
                elementId: `generalization:${umlClass.id}:${superClassId}`,
              },
            },
          })),
      ),
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

function mapClassNode(
  umlClass: UmlClassDto,
  invariants: UmlInvariantDto[],
  layout: DiagramLayoutDto['nodes'][number] | undefined,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
  index: number,
  associationClass: boolean,
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
      abstractClass: umlClass.abstract ?? false,
      qualifiedName: umlClass.qualifiedName ?? umlClass.name,
      associationClass,
      attributes: umlClass.attributes.map(
        (attribute) => `${visibilitySymbol(attribute.visibility)} ${attribute.name} : ${attribute.type}`,
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

function mapModelTypeNode(
  item: { id: Id; name: string; qualifiedName?: string | null },
  kind: 'enumeration' | 'dataType',
  entries: string[],
  index: number,
  layout: DiagramLayoutDto['nodes'][number] | undefined,
  selection: SelectionState,
): DiagramNode {
  return {
    id: item.id,
    type: 'modelType',
    position: {
      x: layout?.x ?? 120 + (index % 3) * fallbackSpacing.x,
      y: layout?.y ?? 120 + Math.floor(index / 3) * fallbackSpacing.y,
    },
    selected: selection?.view === 'class-diagram' && selection.type === kind && selection.id === item.id,
    data: {
      ref: { elementType: kind, elementId: item.id },
      name: item.name,
      qualifiedName: item.qualifiedName ?? undefined,
      kind,
      entries,
    },
  };
}

function mapAssociationEdge(
  association: UmlAssociationDto,
  classIds: Set<Id>,
  markersByElementId: ValidationMarkersByElementId,
  selection: SelectionState,
): DiagramEdge[] {
  if (association.ends.length > 2 || association.associationClassId) {
    return association.ends
      .filter((end) => classIds.has(end.classId))
      .map((end) => ({
        id: `${association.id}:${end.id}`,
        type: 'narySegment' as const,
        source: `nary:${association.id}`,
        target: end.classId,
        selectable: false,
        data: {
          ref: { elementType: 'association' as const, elementId: association.id },
          endLabel: {
            roleName: end.roleName ?? '',
            multiplicity: formatMultiplicity(end.multiplicity),
            aggregationKind: end.aggregationKind ?? 'NONE',
          },
          qualifierNames: (end.qualifiers ?? []).map((qualifier) => qualifier.name),
        },
      }));
  }

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
          roleName: sourceEnd.roleName ?? '',
          multiplicity: formatMultiplicity(sourceEnd.multiplicity),
          aggregationKind: sourceEnd.aggregationKind ?? 'NONE',
        },
        targetEnd: {
          roleName: targetEnd.roleName ?? '',
          multiplicity: formatMultiplicity(targetEnd.multiplicity),
          aggregationKind: targetEnd.aggregationKind ?? 'NONE',
        },
        ...summarizeValidationMarkers(markersByElementId[association.id]),
      },
    },
  ];
}

function centerOfNodes(nodes: DiagramNode[]) {
  if (!nodes.length) return { x: 480, y: 300 };
  return {
    x: nodes.reduce((sum, node) => sum + node.position.x, 0) / nodes.length + 90,
    y: nodes.reduce((sum, node) => sum + node.position.y, 0) / nodes.length + 70,
  };
}

function formatOperation(operation: UmlOperationDto): string {
  const parameters = operation.parameters
    .map((parameter) => `${parameter.name} : ${parameter.type}`)
    .join(', ');

  return `${visibilitySymbol(operation.visibility)} ${operation.name}(${parameters}) : ${operation.returnType}`;
}

function visibilitySymbol(visibility?: string) {
  return { PRIVATE: '-', PROTECTED: '#', PACKAGE: '~', PUBLIC: '+' }[visibility ?? 'PUBLIC'] ?? '+';
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
