import type { Id, SeverityDto, SourceRangeDto } from './common.dto';

export type ValidationStatusDto = 'VALID' | 'INVALID' | 'ERROR';

export type ValidationModeDto = 'FULL_PROJECT' | 'SNAPSHOT_ONLY' | 'OCL_ONLY';

export type ValidationErrorCodeDto =
  | 'SYNTAX_ERROR'
  | 'TYPE_ERROR'
  | 'UNKNOWN_CLASS'
  | 'UNKNOWN_ATTRIBUTE'
  | 'INVALID_SLOT_VALUE'
  | 'INVALID_LINK'
  | 'MULTIPLICITY_VIOLATION'
  | 'INVARIANT_VIOLATION'
  | 'EVALUATION_ERROR';

export type ElementTypeDto =
  | 'PROJECT'
  | 'CLASS'
  | 'ATTRIBUTE'
  | 'OPERATION'
  | 'ASSOCIATION'
  | 'ASSOCIATION_END'
  | 'INVARIANT'
  | 'OBJECT'
  | 'SLOT'
  | 'OBJECT_LINK'
  | 'OCL_EXPRESSION';

export interface ValidationRequestDto {
  mode: ValidationModeDto;
  projectId?: Id;
  project?: unknown;
  snapshotId?: Id;
  changedElementIds?: Id[];
}

export interface ValidationResultDto {
  id?: Id;
  projectId?: Id;
  objectModelId?: Id;
  status: ValidationStatusDto;
  summary: ValidationSummaryDto;
  errors: ValidationErrorDto[];
  warnings?: ValidationErrorDto[];
  infos?: ValidationErrorDto[];
  startedAt?: string;
  checkedAt?: string;
  finishedAt?: string;
}

export interface ValidationSummaryDto {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  checkedInvariantCount?: number;
  checkedObjectCount?: number;
}

export interface ValidationErrorDto {
  id: Id;
  code: ValidationErrorCodeDto;
  severity: SeverityDto;
  message: string;
  userMessage?: string;
  technicalMessage?: string;
  targets: ElementTargetDto[];
  elementType?: ElementTypeDto;
  elementId?: Id;
  relatedElementIds?: Id[];
  invariantId?: Id;
  contextClassId?: Id;
  contextObjectId?: Id;
  associationId?: Id;
  linkId?: Id;
  expression?: string;
  oclExpression?: string;
  actualValue?: unknown;
  details?: Record<string, unknown>;
  suggestedFix?: string;
}

export interface ElementTargetDto {
  elementType: ElementTypeDto;
  elementId: Id;
  path?: string;
  range?: SourceRangeDto;
}
