import { useEffect, useMemo, useState } from 'react';

import { ApiClientError, projectApi } from '../api';
import type { CreateProjectRequestDto, ProjectDto, ProjectSummaryDto } from '../api';
import { getProjectId } from '../api/mappers/projectMapper';
import { navigateTo } from '../app/browserRouter';
import { getWorkspacePath } from '../app/navigation';
import { CreateNewProjectModal } from './dashboard/CreateNewProjectModal';
import { DashboardHeader } from './dashboard/DashboardHeader';

interface ProjectsPageProps {
  createProject?: (request: CreateProjectRequestDto) => Promise<ProjectDto>;
  getProject?: (projectId: string) => Promise<ProjectDto>;
  getProjects?: () => Promise<ProjectSummaryDto[]>;
}

export function ProjectsPage({
  createProject = projectApi.createProject,
  getProject = projectApi.getProject,
  getProjects = projectApi.getProjects,
}: ProjectsPageProps) {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoadingProjects(true);
    setListError(null);

    void getProjects()
      .then((loadedProjects) => {
        if (!cancelled) {
          setProjects(loadedProjects);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListError(projectListErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) => {
      const searchableText = `${project.name} ${project.description ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [projects, searchTerm]);

  const handleOpenProject = async (projectId: string) => {
    setOpenError(null);
    setOpeningProjectId(projectId);

    try {
      await getProject(projectId);
      navigateTo(getWorkspacePath(projectId, 'class-diagram'));
    } catch (error) {
      setOpenError(openProjectErrorMessage(error));
    } finally {
      setOpeningProjectId(null);
    }
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

  return (
    <main className="dashboard-page projects-page">
      <div className="dashboard-content projects-content">
        <DashboardHeader />
        <section className="projects-panel" aria-labelledby="projects-page-title">
          <header className="projects-page-header">
            <button
              type="button"
              className="icon-button projects-back-button"
              aria-label="Back to dashboard"
              onClick={() => navigateTo('/dashboard')}
            >
              &lt;
            </button>
            <div>
              <h1 id="projects-page-title">Projects</h1>
              <p>Open an existing UML/OCL model or start a new project.</p>
            </div>
            <div className="projects-page-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setCreationError(null);
                  setIsCreateProjectModalOpen(true);
                }}
              >
                + New Project
              </button>
            </div>
          </header>

          <label className="projects-search-field" htmlFor="projects-search">
            <span className="visually-hidden">Search projects</span>
            <input
              id="projects-search"
              type="search"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
            />
          </label>

          {listError ? (
            <p className="dashboard-error" role="alert">
              {listError}
            </p>
          ) : null}
          {openError ? (
            <p className="dashboard-error" role="alert">
              {openError}
            </p>
          ) : null}

          {isLoadingProjects ? (
            <p className="projects-empty-state">Loading projects...</p>
          ) : (
            <ProjectCardGrid
              projects={filteredProjects}
              openingProjectId={openingProjectId}
              onOpenProject={handleOpenProject}
            />
          )}
        </section>
      </div>
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

interface ProjectCardGridProps {
  projects: ProjectSummaryDto[];
  openingProjectId: string | null;
  onOpenProject: (projectId: string) => Promise<void>;
}

function ProjectCardGrid({ projects, openingProjectId, onOpenProject }: ProjectCardGridProps) {
  if (projects.length === 0) {
    return (
      <p className="projects-empty-state">
        No projects match the current search.
      </p>
    );
  }

  return (
    <div className="projects-grid" aria-label="Project list">
      {projects.map((project) => (
        <article className="project-list-card" key={project.id}>
          <button
            type="button"
            className="project-list-card-main"
            onClick={() => void onOpenProject(project.id)}
          >
            <span className="dashboard-icon diagram-icon" aria-hidden="true" />
            <span>
              <strong>{project.name}</strong>
              <small>{project.description || 'No description'}</small>
            </span>
          </button>
          <footer>
            <span>{formatUpdatedAt(project.updatedAt)}</span>
            <button
              type="button"
              className="primary-button"
              disabled={openingProjectId === project.id}
              onClick={() => void onOpenProject(project.id)}
            >
              {openingProjectId === project.id ? 'Opening...' : 'Open'}
            </button>
          </footer>
        </article>
      ))}
    </div>
  );
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Updated recently';
  }

  return `Updated ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function projectListErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'Projects could not be loaded.';
}

function openProjectErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'The project could not be opened.';
}

function createProjectErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto.userMessage ?? error.dto.message;
  }

  return 'The project could not be created. Please try again.';
}
