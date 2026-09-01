import type { Id, SeverityDto, SourceRangeDto, UmlTypeDto } from './common.dto';
import type { ElementTargetDto } from './validation.dto';
import type { ProjectDto } from './project.dto';

export interface OclParseRequestDto {
  expression: string;
  invariantId?: Id;
  contextClassId?: Id;
}

export interface OclParseResponseDto {
  valid: boolean;
  diagnostics: OclDiagnosticDto[];
  ast?: unknown;
  normalizedExpression?: string;
}

export interface OclTypecheckRequestDto {
  expression: string;
  contextClassId: Id;
  invariantId?: Id;
}

export interface OclTypecheckResponseDto {
  valid: boolean;
  diagnostics: OclDiagnosticDto[];
  resultType?: UmlTypeDto;
  resolvedReferences?: ElementTargetDto[];
}

export interface OclEvaluateRequestDto {
  expression: string;
  contextObjectId: Id;
  projectId?: Id;
  project?: ProjectDto;
  invariantId?: Id;
  snapshotId?: Id;
}

export interface OclEvaluateResponseDto {
  valid: boolean;
  diagnostics: OclDiagnosticDto[];
  value?: unknown;
  valueType?: UmlTypeDto;
  trace?: unknown;
}

export interface OclDiagnosticDto {
  id?: string | null;
  kind?: string;
  code: string;
  severity: SeverityDto;
  message: string;
  userMessage?: string;
  technicalMessage?: string;
  range?: SourceRangeDto;
  sourceRange?: SourceRangeDto;
  target?: ElementTargetDto;
  targets?: ElementTargetDto[];
  expected?: string[];
  actual?: string | null;
  details?: Record<string, unknown>;
  suggestedFix?: string | null;
  technicalDetails?: Record<string, unknown>;
}

export type OclFeatureStatusDto =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'NOT_SUPPORTED'
  | 'OUT_OF_SCOPE';

export interface OclFeatureSupportDto {
  id: string;
  group: string;
  status: OclFeatureStatusDto;
  standardBasis: string;
  notes: string;
}

export interface OclComplianceProfileDto {
  profileId: string;
  oclVersion: string;
  complianceClaim: string;
  apiVersion: string;
  enabledOptionalCompliancePoints: string[];
  features: OclFeatureSupportDto[];
  runtimeLimits: Record<string, number>;
}
