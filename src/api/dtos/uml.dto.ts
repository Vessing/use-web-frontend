import type { Id, MultiplicityUpperDto, UmlTypeDto } from './common.dto';
import type { SourceRangeDto } from './common.dto';

export interface UmlModelDto {
  id?: Id;
  name?: string;
  primitiveTypes?: string[];
  classes: UmlClassDto[];
  associations: UmlAssociationDto[];
  invariants: UmlInvariantDto[];
  packages?: UmlPackageDto[];
  imports?: UmlModelImportDto[];
  enumerations?: UmlEnumerationDto[];
  dataTypes?: UmlDataTypeDto[];
}

export interface UmlEnumerationLiteralDto { id: Id; name: string; }
export interface UmlEnumerationDto {
  id: Id;
  name: string;
  literals: string[];
  packageId?: Id | null;
  qualifiedName?: string;
  visibility?: UmlVisibilityDto;
  literalDefinitions?: UmlEnumerationLiteralDto[];
}

export interface UmlDataTypePropertyDto { id: Id; name: string; type: UmlTypeDto; }
export interface UmlDataTypeDto {
  id: Id;
  name: string;
  properties: UmlDataTypePropertyDto[];
  packageId?: Id | null;
  qualifiedName?: string;
}

export type UmlVisibilityDto = 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'PACKAGE';

export interface UmlPackageDto {
  id: Id;
  qualifiedName: string;
}

export interface UmlModelImportDto {
  id: Id;
  importingPackageId: Id;
  importedPackageId: Id;
  alias?: string | null;
  source?: string | null;
  provenance?: string | null;
}

export type OclDefinitionKindDto = 'PROPERTY_DEF' | 'OPERATION_DEF';
export type OclDefinitionOwnerKindDto = 'CLASS' | 'PACKAGE';

export interface OclDefinitionElementDto {
  id: Id;
  kind: OclDefinitionKindDto;
  ownerKind: OclDefinitionOwnerKindDto;
  ownerId: Id;
  ownerName: string;
  name: string;
  qualifiedName: string;
  resultType: UmlTypeDto;
  parameters: UmlParameterDto[];
  expression: string;
  sourceRange?: SourceRangeDto | null;
}

export interface UmlClassDto {
  id: Id;
  name: string;
  attributes: UmlAttributeDto[];
  operations: UmlOperationDto[];
  abstract?: boolean;
  abstractClass?: boolean;
  superClassIds?: Id[];
  visibility?: UmlVisibilityDto;
  packageId?: Id | null;
  qualifiedName?: string;
}

export interface UmlAttributeDto {
  id: Id;
  name: string;
  type: UmlTypeDto;
  multiplicity?: MultiplicityDto;
  defaultValue?: unknown;
  readonly?: boolean;
  visibility?: UmlVisibilityDto;
  derived?: boolean;
  deriveExpression?: string | null;
  initExpression?: string | null;
  redefinedAttributeIds?: Id[];
  staticAttribute?: boolean;
  classifierValue?: import('./object-model.dto').SlotValueDto | null;
}

export interface UmlOperationDto {
  id: Id;
  name: string;
  returnType: UmlTypeDto;
  parameters: UmlParameterDto[];
  isQuery?: boolean;
  query?: boolean;
  abstractOperation?: boolean;
  staticOperation?: boolean;
  bodyExpression?: string | null;
  contracts?: UmlOperationContractDto[];
  redefinedOperationIds?: Id[];
  visibility?: UmlVisibilityDto;
}

export type UmlOperationContractKindDto = 'PRE' | 'POST';

export interface UmlOperationContractDto {
  id: Id;
  name: string;
  kind: UmlOperationContractKindDto;
  expression: string;
  enabled: boolean;
}

export interface UmlParameterDto {
  id: Id;
  name: string;
  type: UmlTypeDto;
  direction?: 'IN' | 'OUT' | 'INOUT' | 'in' | 'out' | 'inout';
  position?: number;
}

export interface UmlAssociationDto {
  id: Id;
  name: string;
  ends: UmlAssociationEndDto[];
  kind?: 'association' | 'aggregation' | 'composition';
  associationClassId?: Id | null;
}

export interface UmlAssociationEndDto {
  id: Id;
  classId: Id;
  roleName: string | null;
  multiplicity: MultiplicityDto;
  navigable?: boolean;
  ordered?: boolean;
  unique?: boolean;
  derived?: boolean;
  union?: boolean;
  subsettedEndIds?: Id[];
  redefinedEndIds?: Id[];
  navigationType?: string | null;
  qualifiers?: UmlQualifierDefinitionDto[];
  aggregationKind?: 'NONE' | 'SHARED' | 'COMPOSITE';
}

export interface UmlQualifierDefinitionDto {
  id: Id;
  name: string;
  type: UmlTypeDto;
  order: number;
}

export interface MultiplicityDto {
  lower: number;
  upper: MultiplicityUpperDto;
  unbounded: boolean;
  raw: string;
}

export interface UmlInvariantDto {
  id: Id;
  name: string;
  contextClassId: Id;
  expression: string;
  enabled?: boolean;
  description?: string;
}

export interface CreateClassRequestDto {
  name: string;
  attributes?: Array<Pick<UmlAttributeDto, 'name' | 'type'>>;
  operations?: Array<Pick<UmlOperationDto, 'name' | 'returnType' | 'parameters'>>;
}

export interface CreateAssociationRequestDto {
  name: string;
  ends: Array<Omit<UmlAssociationEndDto, 'id'>>;
}
