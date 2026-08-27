import type { Edge, Node } from '@xyflow/react';

import type { Id } from '../../api/dtos';

export type DiagramElementKind = 'class' | 'association' | 'object' | 'objectLink';
export type DiagramValidationState = 'none' | 'warning' | 'error';

export interface DiagramElementRef {
  elementType: DiagramElementKind;
  elementId: Id;
}

export interface UmlClassNodeData extends Record<string, unknown> {
  ref: DiagramElementRef;
  name: string;
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
  slots: string[];
  validationState?: DiagramValidationState;
  validationIssueCount?: number;
}

export interface AssociationEndLabel {
  roleName: string;
  multiplicity: string;
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

export type DiagramNode =
  | Node<UmlClassNodeData, 'umlClass'>
  | Node<ObjectNodeData, 'objectNode'>;

export type DiagramEdge =
  | Edge<UmlAssociationEdgeData, 'umlAssociation'>
  | Edge<ObjectLinkEdgeData, 'objectLink'>;
