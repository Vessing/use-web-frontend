import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  CreateAssociationRequestDto,
  CreateClassRequestDto,
  ProjectDto,
  UmlAssociationDto,
  UmlClassDto,
} from '../dtos';
import { normalizeProjectDto } from '../mappers/projectDtoNormalizer';

export function createUmlApi(client: HttpClient = httpClient) {
  return {
    createClass: (projectId: string, request: CreateClassRequestDto) =>
      client.post<UmlClassDto>(`/projects/${encodeURIComponent(projectId)}/classes`, request),
    updateClass: (projectId: string, classId: string, request: UmlClassDto) =>
      client.put<UmlClassDto>(
        `/projects/${encodeURIComponent(projectId)}/classes/${encodeURIComponent(classId)}`,
        request,
      ),
    deleteClass: (projectId: string, classId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/classes/${encodeURIComponent(classId)}`,
      ).then(normalizeProjectDto),
    deleteAttribute: (projectId: string, classId: string, attributeId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/classes/${encodeURIComponent(
          classId,
        )}/attributes/${encodeURIComponent(attributeId)}`,
      ).then(normalizeProjectDto),
    createAssociation: (projectId: string, request: CreateAssociationRequestDto) =>
      client.post<UmlAssociationDto>(
        `/projects/${encodeURIComponent(projectId)}/associations`,
        request,
      ),
  };
}

export const umlApi = createUmlApi();
