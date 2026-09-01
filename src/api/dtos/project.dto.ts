import type { LayoutDto } from './layout.dto';
import type { ObjectModelDto } from './object-model.dto';
import type { UmlModelDto } from './uml.dto';
import type { ApiErrorDto } from './error.dto';
import type { OclDiagnosticDto } from './ocl.dto';
import type { OclDefinitionElementDto } from './uml.dto';

export interface ProjectDto {
  formatVersion: string;
  project: ProjectMetadataDto;
  modelText?: ModelTextDto | null;
  umlModel: UmlModelDto;
  objectModel: ObjectModelDto;
  layout: LayoutDto;
  validationState?: ValidationStateDto;
  extensions?: Record<string, unknown>;
  definitions?: OclDefinitionElementDto[];
}

export interface ProjectMetadataDto {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion?: string;
  sourceFormat?: 'json' | 'use' | 'example';
}

export interface ValidationStateDto {
  lastCheckedAt?: string | null;
  status?: string | null;
  summary?: unknown;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  updatedAt: string;
  description?: string;
  sourceFormat?: 'json' | 'use' | 'example';
  thumbnail?: string;
}

export interface CreateProjectRequestDto {
  name: string;
  description?: string;
  template?: 'empty' | 'library';
}

export interface ImportProjectRequestDto {
  format: 'json' | 'use';
  content: unknown;
}

export interface ImportProjectResultDto {
  status?: string;
  project?: ProjectDto;
  diagnostics?: ApiErrorDto[];
}

export interface ModelTextDto {
  projectId: string;
  modelText: string;
  format: string;
  version?: string;
  sourceName?: string | null;
  sourceOrigin?: string | null;
  lineEnding?: string;
  updatedAt?: string;
}

export interface ApplyModelTextRequestDto {
  modelText: string;
  format: 'USE_MODEL_TEXT';
  mode: 'REPLACE_UML_MODEL';
  includeDiagnostics: boolean;
  sourceName: string;
  sourceFormat: 'use';
  sourceOrigin: 'open-existing' | 'ocl-editor';
  baseVersion?: string | null;
}

export interface ApplyModelTextResponseDto {
  success: boolean;
  status: 'APPLIED' | 'APPLIED_WITH_WARNINGS' | 'NOT_APPLIED' | string;
  project: ProjectDto;
  modelText: ModelTextDto;
  diagnostics: OclDiagnosticDto[];
  changedElementIds: string[];
}
