import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  OclEvaluateRequestDto,
  OclEvaluateResponseDto,
  OclParseRequestDto,
  OclParseResponseDto,
  OclTypecheckRequestDto,
  OclTypecheckResponseDto,
} from '../dtos';

export function createOclApi(client: HttpClient = httpClient) {
  return {
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
