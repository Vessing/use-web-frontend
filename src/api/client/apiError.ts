import type { ApiErrorDto } from '../dtos';

export class ApiClientError extends Error {
  readonly status: number;
  readonly dto: ApiErrorDto;

  constructor(status: number, dto: ApiErrorDto) {
    super(dto.userMessage ?? dto.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.dto = dto;
  }
}

export function normalizeApiError(
  input: unknown,
  fallback: Partial<ApiErrorDto> = {},
): ApiErrorDto {
  const value = isRecord(input) ? input : {};
  const nestedError = isRecord(value.error) ? value.error : undefined;
  const source = nestedError ?? value;

  return {
    code: readString(source.code) ?? fallback.code ?? 'API_ERROR',
    message: readString(source.message) ?? fallback.message ?? 'An API request failed.',
    userMessage: readString(source.userMessage) ?? fallback.userMessage,
    technicalMessage: readString(source.technicalMessage) ?? fallback.technicalMessage,
    path: readString(source.path) ?? fallback.path,
    timestamp: readString(source.timestamp) ?? fallback.timestamp ?? new Date().toISOString(),
    requestId: readString(source.requestId) ?? readString(source.traceId) ?? fallback.requestId,
    details: isRecord(source.details) ? source.details : fallback.details,
    fieldErrors: isStringRecord(source.fieldErrors) ? source.fieldErrors : fallback.fieldErrors,
    severity: readSeverity(source.severity) ?? fallback.severity,
  };
}

export function toApiClientError(status: number, input: unknown, fallback?: Partial<ApiErrorDto>) {
  return new ApiClientError(status, normalizeApiError(input, fallback));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readSeverity(value: unknown): ApiErrorDto['severity'] | undefined {
  return value === 'ERROR' || value === 'WARNING' || value === 'INFO' ? value : undefined;
}
