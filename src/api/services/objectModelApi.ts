import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  CreateObjectRequestDto,
  ObjectInstanceDto,
  ProjectDto,
} from '../dtos';
import { normalizeProjectDto } from '../mappers/projectDtoNormalizer';

export function createObjectModelApi(client: HttpClient = httpClient) {
  return {
    createObject: (projectId: string, request: CreateObjectRequestDto) =>
      client.post<ObjectInstanceDto>(`/projects/${encodeURIComponent(projectId)}/objects`, request),
    updateObject: (projectId: string, objectId: string, request: ObjectInstanceDto) =>
      client.put<ObjectInstanceDto>(
        `/projects/${encodeURIComponent(projectId)}/objects/${encodeURIComponent(objectId)}`,
        request,
      ),
    deleteObject: (projectId: string, objectId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/objects/${encodeURIComponent(objectId)}`,
      ).then(normalizeProjectDto),
  };
}

export const objectModelApi = createObjectModelApi();
