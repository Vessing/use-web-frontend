import type { ProjectDto } from '../dtos';

export function getProjectId(project: ProjectDto): string {
  const projectId = project.project.id;

  if (!projectId) {
    throw new Error('ProjectDto does not contain a project id.');
  }

  return projectId;
}

export function getProjectName(project: ProjectDto): string {
  return project.project.name;
}
