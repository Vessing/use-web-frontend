import type { ProjectDto } from '../../api/dtos';

export function getEditableModelText(project: ProjectDto): string {
  return project.modelText?.modelText ?? '';
}
