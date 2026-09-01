import type { ValidationErrorDto } from './validation.dto';

export interface ProjectReadModelDto {
  projectId: string;
  modelId: string;
  snapshotId?: string | null;
  readVersion: string;
  capabilities: Record<string, boolean>;
  explorer: ExplorerElementDto[];
  classes: ClassProjectionDto[];
  definitions?: DefinitionProjectionDto[];
  objects?: ObjectProjectionDto[];
  diagnostics: ValidationErrorDto[];
}

export interface NamedElementDto {
  id: string;
  name: string;
  qualifiedName: string;
  kind: string;
}

export interface ClassProjectionDto {
  id: string;
  name: string;
  qualifiedName: string;
  abstractClass: boolean;
  directSuperClasses: NamedElementDto[];
  generalizationOrder: NamedElementDto[];
  attributes: FeatureProjectionDto[];
  operations: FeatureProjectionDto[];
}

export interface FeatureProjectionDto {
  id: string;
  name: string;
  qualifiedName: string;
  kind: 'ATTRIBUTE' | 'OPERATION' | string;
  type: string;
  definingClassifier: NamedElementDto;
  inherited: boolean;
  derived: boolean;
  readOnly: boolean;
  staticFeature: boolean;
  expression?: string | null;
  redefinedFeatures: NamedElementDto[];
}

export interface DefinitionProjectionDto {
  id: string;
  kind: 'PROPERTY_DEF' | 'OPERATION_DEF' | string;
  name: string;
  qualifiedName: string;
  owner: NamedElementDto;
  resultType: string;
  parameters: NamedElementDto[];
  expression: string;
  sourceRange?: import('./common.dto').SourceRangeDto | null;
  readOnly: boolean;
}

export interface ObjectProjectionDto {
  id: string;
  name: string;
  classifier: NamedElementDto;
  slots: SlotProjectionDto[];
}

export interface SlotProjectionDto {
  id: string;
  attributeId: string;
  attributeName: string;
  type: string;
  definingClassifier: NamedElementDto;
  inherited: boolean;
  derived: boolean;
  readOnly: boolean;
  valueStatus: 'VALUE' | 'NULL' | 'INVALID' | string;
  value?: ValueProjectionDto | null;
  diagnostics: ValidationErrorDto[];
}

export interface ValueProjectionDto {
  status: 'VALUE' | 'NULL' | 'INVALID' | string;
  type: string;
  kind: string;
  scalar?: unknown;
  elements?: ValueProjectionDto[];
  fields?: Record<string, ValueProjectionDto>;
}

export interface ExplorerElementDto {
  nodeId: string;
  elementId: string;
  parentNodeId?: string | null;
  name: string;
  qualifiedName?: string | null;
  kind: string;
  imported: boolean;
  readOnly: boolean;
  importId?: string | null;
  provenance?: string | null;
}
