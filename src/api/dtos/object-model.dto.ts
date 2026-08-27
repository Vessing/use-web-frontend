import type { Id, UmlTypeDto } from './common.dto';

export interface ObjectModelDto {
  id?: Id;
  snapshotId?: Id;
  name?: string;
  objects: ObjectInstanceDto[];
  links: ObjectLinkDto[];
}

export interface ObjectInstanceDto {
  id: Id;
  name: string;
  classId: Id;
  slots: SlotDto[];
  displayName?: string;
}

export interface SlotDto {
  id: Id;
  attributeId: Id;
  value: string | number | boolean | null;
  valueType?: UmlTypeDto;
  isUnset?: boolean;
}

export interface ObjectLinkDto {
  id: Id;
  associationId: Id;
  endValues: ObjectLinkEndValueDto[];
  name?: string;
}

export interface ObjectLinkEndValueDto {
  associationEndId: Id;
  objectId: Id;
}

export interface CreateObjectRequestDto {
  name: string;
  classId: Id;
  slots?: Array<Omit<SlotDto, 'id'>>;
}

export interface CreateObjectLinkRequestDto {
  associationId: Id;
  endValues: ObjectLinkEndValueDto[];
}
