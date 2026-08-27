import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  CreateObjectLinkRequestDto,
  CreateObjectRequestDto,
  ObjectInstanceDto,
  ObjectLinkDto,
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
    createObjectLink: (projectId: string, request: CreateObjectLinkRequestDto) =>
      client.post<ObjectLinkDto>(`/projects/${encodeURIComponent(projectId)}/links`, request),
    deleteObjectLink: (projectId: string, linkId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/links/${encodeURIComponent(linkId)}`,
      ).then(normalizeProjectDto),
  };
}

export const objectModelApi = createObjectModelApi();
