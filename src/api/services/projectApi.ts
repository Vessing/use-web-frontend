import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  CreateProjectRequestDto,
  ApplyModelTextRequestDto,
  ApplyModelTextResponseDto,
  ImportProjectRequestDto,
  ImportProjectResultDto,
  ProjectDto,
  ProjectSummaryDto,
} from '../dtos';
import { normalizeProjectDto, toBackendProjectDto } from '../mappers/projectDtoNormalizer';

export interface ProjectApi {
  createProject(request: CreateProjectRequestDto): Promise<ProjectDto>;
  getProject(projectId: string): Promise<ProjectDto>;
  getProjects(): Promise<ProjectSummaryDto[]>;
  saveProject(projectId: string, project: ProjectDto): Promise<ProjectDto>;
  importProject(request: ImportProjectRequestDto): Promise<ImportProjectResultDto>;
  applyModelText(
    projectId: string,
    request: ApplyModelTextRequestDto,
  ): Promise<ApplyModelTextResponseDto>;
  getRecentProjects(): Promise<ProjectSummaryDto[]>;
}

export function createProjectApi(client: HttpClient = httpClient): ProjectApi {
  return {
    createProject: async (request) =>
      normalizeProjectDto(
        await client.post<ProjectDto, CreateProjectRequestDto>('/projects', request),
      ),
    getProject: async (projectId) =>
      normalizeProjectDto(
        await client.get<ProjectDto>(`/projects/${encodeURIComponent(projectId)}`),
      ),
    getProjects: () => client.get('/projects'),
    saveProject: (projectId, project) =>
      client
        .put<ProjectDto, ProjectDto>(
          `/projects/${encodeURIComponent(projectId)}`,
          toBackendProjectDto(project),
        )
        .then(normalizeProjectDto),
    importProject: (request) => client.post('/projects/import', request),
    applyModelText: (projectId, request) =>
      client
        .post<ApplyModelTextResponseDto, ApplyModelTextRequestDto>(
          `/projects/${encodeURIComponent(projectId)}/model-text/apply`,
          request,
        )
        .then((response) => ({
          ...response,
          project: normalizeProjectDto(response.project),
        })),
    getRecentProjects: () => client.get('/projects/recent'),
  };
}

export const projectApi = createProjectApi();
