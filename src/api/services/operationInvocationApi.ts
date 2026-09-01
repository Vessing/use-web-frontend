import { httpClient, type HttpClient } from '../client/httpClient';
import type { OperationInvocationRequestDto, OperationInvocationResultDto } from '../dtos';

export function createOperationInvocationApi(client: HttpClient = httpClient) {
  return {
    invoke: (projectId: string, operationId: string, request: OperationInvocationRequestDto) =>
      client.post<OperationInvocationResultDto, OperationInvocationRequestDto>(
        `/projects/${encodeURIComponent(projectId)}/operations/${encodeURIComponent(operationId)}/invocations`,
        request,
      ),
  };
}

export const operationInvocationApi = createOperationInvocationApi();
