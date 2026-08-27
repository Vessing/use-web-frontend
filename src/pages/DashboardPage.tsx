import { useEffect, useState } from 'react';

import { ApiClientError, projectApi } from '../api';
import type {
  ApplyModelTextRequestDto,
  ApplyModelTextResponseDto,
  CreateProjectRequestDto,
  ProjectDto,
  ProjectSummaryDto,
} from '../api';
import { getProjectId } from '../api/mappers/projectMapper';
import { navigateTo } from '../app/browserRouter';
import { getWorkspacePath } from '../app/navigation';
import { CreateNewModelCard } from './dashboard/CreateNewModelCard';
import { CreateNewProjectModal } from './dashboard/CreateNewProjectModal';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { LearnSupportSection } from './dashboard/LearnSupportSection';
import { OpenExistingCard } from './dashboard/OpenExistingCard';
import { OpenExistingProjectModal } from './dashboard/OpenExistingProjectModal';
import { RecentProjectsSection } from './dashboard/RecentProjectsSection';

interface DashboardPageProps {
  createProject?: (request: CreateProjectRequestDto) => Promise<ProjectDto>;
  getProject?: (projectId: string) => Promise<ProjectDto>;
  getRecentProjects?: () => Promise<ProjectSummaryDto[]>;
  applyModelText?: (
    projectId: string,
    request: ApplyModelTextRequestDto,
  ) => Promise<ApplyModelTextResponseDto>;
}

export function DashboardPage({
  createProject = projectApi.createProject,
  getProject = projectApi.getProject,
  getRecentProjects = projectApi.getRecentProjects,
  applyModelText = projectApi.applyModelText,
}: DashboardPageProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isOpenExistingModalOpen, setIsOpenExistingModalOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<ProjectSummaryDto[]>([]);
  const [recentProjectsError, setRecentProjectsError] = useState<string | null>(null);
  const [isLoadingRecentProjects, setIsLoadingRecentProjects] = useState(true);
  const [openingRecentProjectId, setOpeningRecentProjectId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadRecentProjects() {
      setIsLoadingRecentProjects(true);
      setRecentProjectsError(null);

      try {
        const projects = await getRecentProjects();
        if (isActive) {
          setRecentProjects(projects);
        }
      } catch (error) {
        if (isActive) {
          setRecentProjectsError(recentProjectsErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoadingRecentProjects(false);
        }
      }
    }

    void loadRecentProjects();

    return () => {
      isActive = false;
    };
  }, [getRecentProjects]);

  const handleStartProject = () => {
    setCreationError(null);
    setIsCreateProjectModalOpen(true);
  };

  const handleCreateProject = async (name: string) => {
    setIsCreatingProject(true);
    setCreationError(null);

    try {
      const project = await createProject({ name });

      setIsCreateProjectModalOpen(false);
      navigateTo(getWorkspacePath(getProjectId(project), 'class-diagram'));
    } catch (error) {
      setCreationError(createProjectErrorMessage(error));
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleImportUseFile = async (file: File, modelText: string) => {
    const project = await createProject({
      name: projectNameFromFile(file.name),
      description: `Imported from ${file.name}`,
      template: 'empty',
    });
    const projectId = getProjectId(project);
    const response = await applyModelText(projectId, {
      modelText,
      format: 'USE_MODEL_TEXT',
      mode: 'REPLACE_UML_MODEL',
      includeDiagnostics: true,
      sourceName: file.name,
      sourceFormat: 'use',
      sourceOrigin: 'open-existing',
      baseVersion: null,
    });

    if (response.success && (response.diagnostics ?? []).length === 0) {
      navigateTo(getWorkspacePath(projectId, 'class-diagram'));
    }

    return response;
  };

  const handleOpenRecentProject = async (projectId: string) => {
    setOpeningRecentProjectId(projectId);
    setRecentProjectsError(null);

    try {
      const project = await getProject(projectId);
      navigateTo(getWorkspacePath(getProjectId(project), 'class-diagram'));
    } catch (error) {
      setRecentProjectsError(openProjectErrorMessage(error));
    } finally {
      setOpeningRecentProjectId(null);
    }
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-content">
        <DashboardHeader />
        <div className="dashboard-actions-grid">
          <CreateNewModelCard isCreating={isCreatingProject} onStartProject={handleStartProject} />
          <OpenExistingCard onOpenExisting={() => setIsOpenExistingModalOpen(true)} />
        </div>
        <RecentProjectsSection
          isLoading={isLoadingRecentProjects}
          onOpenProject={handleOpenRecentProject}
          openingProjectId={openingRecentProjectId}
          projects={recentProjects}
          recentProjectsError={recentProjectsError}
        />
        <LearnSupportSection />
      </div>
      <OpenExistingProjectModal
        isOpen={isOpenExistingModalOpen}
        onClose={() => setIsOpenExistingModalOpen(false)}
        onImportUseFile={handleImportUseFile}
      />
      <CreateNewProjectModal
        error={creationError}
        isCreating={isCreatingProject}
        isOpen={isCreateProjectModalOpen}
        onClose={() => {
          setCreationError(null);
          setIsCreateProjectModalOpen(false);
        }}
        onCreateProject={handleCreateProject}
      />
    </main>
  );
}

function projectNameFromFile(fileName: string) {
  const withoutExtension = fileName.replace(/\.use$/i, '').trim();
  return withoutExtension || 'Imported USE Model';
}

function createProjectErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'The project could not be created. Please try again.';
}

function recentProjectsErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'Recent projects could not be loaded.';
}

function openProjectErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'The selected project could not be opened.';
}
