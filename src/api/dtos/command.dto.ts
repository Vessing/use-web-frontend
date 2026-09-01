import type { ObjectInstanceDto, ObjectLinkDto, SlotValueDto } from './object-model.dto';
import type { UmlAssociationDto, UmlClassDto } from './uml.dto';
import type { SourceRangeDto } from './common.dto';

export interface MutationCommandRequestDto<TDraft> {
  expectedRevision: string;
  draft: TDraft;
}

export interface CommandElementReferenceDto {
  referenceId: string;
  elementType: string;
  elementId: string;
  elementName: string;
  path?: string | null;
  relation: string;
  cascadeAllowed: boolean;
  sourceRange?: SourceRangeDto | null;
}

export interface MutationResultDto<TResult = unknown> {
  command: string;
  revisionScope: 'MODEL' | 'SNAPSHOT';
  revision: string;
  result: TResult;
  affectedElements: CommandElementReferenceDto[];
}

export interface DeleteImpactDto {
  revisionScope: 'MODEL' | 'SNAPSHOT';
  revision: string;
  target: CommandElementReferenceDto;
  references: CommandElementReferenceDto[];
  blocked: boolean;
}

export interface DeleteCommandRequestDto {
  expectedRevision: string;
  cascadeReferenceIds: string[];
  enumerationId?: string | null;
}

export interface ObjectLinkDeleteImpactDto {
  revisionScope: 'SNAPSHOT';
  revision: string;
  target: CommandElementReferenceDto;
  currentLink: import('./object-model.dto').ObjectLinkDto;
  context: CommandElementReferenceDto[];
  blockers: CommandElementReferenceDto[];
  allowedCascades: CommandElementReferenceDto[];
  validationTargets: CommandElementReferenceDto[];
  blocked: boolean;
}

export interface GeneralizationDraftDto {
  supertypeIds: string[];
}

export interface RedefinitionDraftDto {
  featureKind: 'ATTRIBUTE' | 'OPERATION';
  localFeatureId: string;
  redefinedFeatureIds: string[];
  supertypeIds?: string[];
}

export interface AssociationClassAggregateDto {
  association: UmlAssociationDto;
  associationClass: UmlClassDto;
}

export interface AssociationClassInstanceDraftDto {
  link: ObjectLinkDto;
  associationClassObject: AssociationClassObjectDraftDto;
}

export interface AssociationClassObjectDraftDto {
  id: string;
  name: string;
  classId: string;
  slots: Array<{ id: string; attributeId: string; value: SlotValueDto; isUnset: boolean }>;
}

export interface AssociationClassInstanceAggregateDto {
  link: ObjectLinkDto;
  associationClassObject: ObjectInstanceDto;
}
