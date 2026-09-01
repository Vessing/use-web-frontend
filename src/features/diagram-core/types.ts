import type { Edge, Node } from '@xyflow/react';

import type { Id } from '../../api/dtos';

export type DiagramElementKind = 'class' | 'association' | 'generalization' | 'enumeration' | 'dataType' | 'object' | 'objectLink';
export type DiagramValidationState = 'none' | 'warning' | 'error';

export interface DiagramElementRef {
  elementType: DiagramElementKind;
  elementId: Id;
}

export interface UmlClassNodeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  name: string;
  abstractClass?: boolean;
  qualifiedName?: string;
  associationClass?: boolean;
  attributes: string[];
  operations: string[];
  invariants: Array<{
    id: Id;
    label: string;
    validationState?: DiagramValidationState;
    validationIssueCount?: number;
    selected?: boolean;
  }>;
  validationState?: DiagramValidationState;
  validationIssueCount?: number;
}

export interface ObjectNodeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  name: string;
  className: string;
  associationClass?: boolean;
  slots: string[];
  validationState?: DiagramValidationState;
  validationIssueCount?: number;
}

export interface AssociationEndLabel {
  roleName: string;
  multiplicity: string;
  aggregationKind?: 'NONE' | 'SHARED' | 'COMPOSITE';
}

export interface UmlAssociationEdgeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  associationName: string;
  sourceEnd: AssociationEndLabel;
  targetEnd: AssociationEndLabel;
  validationState?: DiagramValidationState;
  validationIssueCount?: number;
}

export interface ObjectLinkEdgeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  associationName: string;
  sourceEnd: AssociationEndLabel;
  targetEnd: AssociationEndLabel;
  validationState?: DiagramValidationState;
  validationIssueCount?: number;
}

export interface UmlGeneralizationEdgeData extends Record<string, unknown> {
  ref: DiagramElementRef;
}

export interface NaryHubNodeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  name: string;
  participantCount: number;
}

export interface ModelTypeNodeData extends Record<string, unknown> { ref: DiagramElementRef; name: string; qualifiedName?: string; kind: 'enumeration' | 'dataType'; entries: string[]; }

export interface NarySegmentEdgeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  endLabel: AssociationEndLabel;
  qualifierNames: string[];
}

export interface SemanticConnectorEdgeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  label: string;
}

export type DiagramNode =
  | Node<UmlClassNodeData, 'umlClass'>
  | Node<ObjectNodeData, 'objectNode'>
  | Node<ModelTypeNodeData, 'modelType'>
  | Node<NaryHubNodeData, 'naryHub'>;

export type DiagramEdge =
  | Edge<UmlAssociationEdgeData, 'umlAssociation'>
  | Edge<UmlGeneralizationEdgeData, 'umlGeneralization'>
  | Edge<ObjectLinkEdgeData, 'objectLink'>
  | Edge<NarySegmentEdgeData, 'narySegment'>
  | Edge<SemanticConnectorEdgeData, 'semanticConnector'>;
