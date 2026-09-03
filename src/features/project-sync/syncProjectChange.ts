import { ApiClientError, projectApi } from '../../api';
import type { ProjectDto } from '../../api/dtos';
import { appStoreActions } from '../../state';

interface SyncProjectChangeOptions {
  projectId: string;
  nextProject: ProjectDto;
  onProjectChange: (project: ProjectDto) => void;
  successMessage?: string;
}

export function syncProjectChange({
  projectId,
  nextProject,
  onProjectChange,
  successMessage = 'Project changes saved.',
}: SyncProjectChangeOptions) {
  onProjectChange(nextProject);
  appStoreActions.markValidationStale();
  appStoreActions.addConsoleLog({
    level: 'debug',
    source: 'api',
    message: `Saving project "${nextProject.project.name}".`,
  });

  void projectApi
    .saveProject(projectId, nextProject)
    .then((savedProject) => {
      onProjectChange(savedProject);
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: successMessage,
      });
    })
    .catch((error: unknown) => {
      appStoreActions.addConsoleLog({
        level: 'error',
        source: 'api',
        message: formatSyncError(error),
      });
    });
}

function formatSyncError(error: unknown) {
  if (error instanceof ApiClientError) {
    return `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`;
  }

  if (error instanceof Error) {
    return `Project changes could not be saved: ${error.message}`;
  }

  return 'Project changes could not be saved.';
}
