import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  SeverityDto,
  ValidationErrorDto,
  ValidationRequestDto,
  ValidationResultDto,
} from '../dtos';

type BackendValidationResultDto = Omit<
  ValidationResultDto,
  'errors' | 'warnings' | 'infos' | 'finishedAt'
> & {
  errors?: ValidationErrorDto[];
  warnings?: ValidationErrorDto[];
  infos?: ValidationErrorDto[];
  findings?: ValidationErrorDto[];
  checkedAt?: string;
  finishedAt?: string;
};

export function createValidationApi(client: HttpClient = httpClient) {
  return {
    validateProject: async (
      projectId: string,
      request: ValidationRequestDto = { mode: 'FULL_PROJECT' },
    ) =>
      normalizeValidationResult(
        await client.post<BackendValidationResultDto>(
          `/projects/${encodeURIComponent(projectId)}/validate`,
          request,
        ),
      ),
  };
}

export const validationApi = createValidationApi();

function normalizeValidationResult(
  result: BackendValidationResultDto,
): ValidationResultDto {
  const findings = result.findings ?? [];

  const errors = result.errors ?? findingsBySeverity(findings, 'ERROR');
  const warnings = result.warnings ?? findingsBySeverity(findings, 'WARNING');
  const infos = result.infos ?? findingsBySeverity(findings, 'INFO');

  return {
    ...result,
    errors: errors.map(normalizeValidationMessage),
    warnings: warnings.map(normalizeValidationMessage),
    infos: infos.map(normalizeValidationMessage),
    finishedAt: result.finishedAt ?? result.checkedAt,
  };
}

function findingsBySeverity(
  findings: ValidationErrorDto[],
  severity: SeverityDto,
) {
  return findings.filter((finding) => finding.severity === severity);
}

function normalizeValidationMessage(message: ValidationErrorDto) {
  return {
    ...message,
    targets: message.targets ?? [],
  };
}
