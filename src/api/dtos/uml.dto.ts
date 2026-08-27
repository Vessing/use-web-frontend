import type { Id, MultiplicityUpperDto, UmlTypeDto } from './common.dto';

export interface UmlModelDto {
  classes: UmlClassDto[];
  associations: UmlAssociationDto[];
  invariants: UmlInvariantDto[];
}

export interface UmlClassDto {
  id: Id;
  name: string;
  attributes: UmlAttributeDto[];
  operations: UmlOperationDto[];
  abstract?: boolean;
  superClassIds?: Id[];
}

export interface UmlAttributeDto {
  id: Id;
  name: string;
  type: UmlTypeDto;
  multiplicity?: MultiplicityDto;
  defaultValue?: unknown;
  readonly?: boolean;
}

export interface UmlOperationDto {
  id: Id;
  name: string;
  returnType: UmlTypeDto;
  parameters: UmlParameterDto[];
  isQuery?: boolean;
}

export interface UmlParameterDto {
  id: Id;
  name: string;
  type: UmlTypeDto;
  direction?: 'in' | 'out' | 'inout';
}

export interface UmlAssociationDto {
  id: Id;
  name: string;
  ends: UmlAssociationEndDto[];
  kind?: 'association' | 'aggregation' | 'composition';
}

export interface UmlAssociationEndDto {
  id: Id;
  classId: Id;
  roleName: string;
  multiplicity: MultiplicityDto;
  navigable?: boolean;
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

export interface CreateInvariantRequestDto {
  name: string;
  contextClassId: Id;
  expression: string;
  enabled?: boolean;
}
