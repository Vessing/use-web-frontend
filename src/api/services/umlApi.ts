import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  CreateAssociationRequestDto,
  CreateClassRequestDto,
  CreateInvariantRequestDto,
  ProjectDto,
  UmlAssociationDto,
  UmlClassDto,
  UmlInvariantDto,
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
    deleteOperation: (projectId: string, classId: string, operationId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/classes/${encodeURIComponent(
          classId,
        )}/operations/${encodeURIComponent(operationId)}`,
      ).then(normalizeProjectDto),
    createAssociation: (projectId: string, request: CreateAssociationRequestDto) =>
      client.post<UmlAssociationDto>(
        `/projects/${encodeURIComponent(projectId)}/associations`,
        request,
      ),
    deleteAssociation: (projectId: string, associationId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/associations/${encodeURIComponent(
          associationId,
        )}`,
      ).then(normalizeProjectDto),
    createInvariant: (projectId: string, request: CreateInvariantRequestDto) =>
      client.post<UmlInvariantDto>(
        `/projects/${encodeURIComponent(projectId)}/invariants`,
        request,
      ),
    deleteInvariant: (projectId: string, invariantId: string) =>
      client.delete<ProjectDto>(
        `/projects/${encodeURIComponent(projectId)}/invariants/${encodeURIComponent(
          invariantId,
        )}`,
      ).then(normalizeProjectDto),
  };
}

export const umlApi = createUmlApi();
