import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  OclEvaluateRequestDto,
  OclEvaluateResponseDto,
  OclComplianceProfileDto,
  OclParseRequestDto,
  OclParseResponseDto,
  OclTypecheckRequestDto,
  OclTypecheckResponseDto,
} from '../dtos';

export function createOclApi(client: HttpClient = httpClient) {
  return {
    getComplianceProfile: () => client.get<OclComplianceProfileDto>('/ocl/profile'),
    parseExpression: (projectId: string, request: OclParseRequestDto) =>
      client.post<OclParseResponseDto>(
        `/projects/${encodeURIComponent(projectId)}/ocl/parse`,
        request,
      ),
    typecheckExpression: (projectId: string, request: OclTypecheckRequestDto) =>
      client.post<OclTypecheckResponseDto>(
        `/projects/${encodeURIComponent(projectId)}/ocl/typecheck`,
        request,
      ),
    evaluateExpression: (projectId: string, request: OclEvaluateRequestDto) =>
      client.post<OclEvaluateResponseDto>(
        `/projects/${encodeURIComponent(projectId)}/ocl/evaluate`,
        request,
      ),
  };
}

export const oclApi = createOclApi();
