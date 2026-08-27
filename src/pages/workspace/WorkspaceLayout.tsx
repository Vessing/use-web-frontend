import { useCallback, useEffect, useRef, useState } from 'react';

import { projectApi, type ProjectDto } from '../../api';
import type { WorkspaceView } from '../../app/navigation';
import { appStoreActions, getAppState, useAppStore, type LayoutDraftState } from '../../state';
import { BottomPanel } from './components/BottomPanel';
import { ExplorerSidebar } from './components/ExplorerSidebar';
import { MainWorkspaceView } from './components/MainWorkspaceView';
import { ModalLayer } from './components/ModalLayer';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TopBar } from './components/TopBar';

interface WorkspaceLayoutProps {
  projectId: string;
  activeView: WorkspaceView;
}

export function WorkspaceLayout({ projectId, activeView }: WorkspaceLayoutProps) {
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isRefreshingProject, setIsRefreshingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const layoutDraft = useAppStore((state) => state.layoutDraft);
  const projectRef = useRef<ProjectDto | null>(project);
  const usesWorkspaceSidebars = activeView !== 'ocl';

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const loadProject = useCallback(async (options?: { showConsoleFeedback?: boolean }) => {
    setIsLoadingProject(true);
    setProjectError(null);

    try {
      const loadedProject = await projectApi.getProject(projectId);
      setProject(loadedProject);
      projectRef.current = loadedProject;

      if (options?.showConsoleFeedback) {
        appStoreActions.addConsoleLog({
          level: 'info',
          source: 'api',
          message: 'Project refreshed.',
        });
      }

      return true;
    } catch (error) {
      setProject(null);
      setProjectError('The project model could not be loaded.');

      if (options?.showConsoleFeedback) {
        appStoreActions.addConsoleLog({
          level: 'error',
          source: 'api',
          message: formatProjectLoadError(error),
        });
      }

      return false;
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    void loadProject().finally(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadProject]);

  const handleRefresh = useCallback(() => {
    setIsRefreshingProject(true);
    void loadProject({ showConsoleFeedback: true })
      .then((refreshed) => {
        if (refreshed) {
          appStoreActions.markLayoutSaved();
        }
      })
      .finally(() => setIsRefreshingProject(false));
  }, [loadProject]);

  useEffect(() => {
    if (!layoutDraft.dirty) {
      return undefined;
    }

    const draftToSave = layoutDraft;
    const timeoutId = window.setTimeout(() => {
      const currentProject = projectRef.current;

      if (!currentProject) {
        return;
      }

      const nextProject = mergeLayoutDraft(currentProject, draftToSave);
      setProject(nextProject);
      projectRef.current = nextProject;

      appStoreActions.addConsoleLog({
        level: 'debug',
        source: 'api',
        message: `Saving layout for project ${projectId}.`,
      });

      void projectApi
        .saveProject(projectId, nextProject)
        .then((savedProject) => {
          setProject(savedProject);
          projectRef.current = savedProject;

          if (getAppState().layoutDraft === draftToSave) {
            appStoreActions.markLayoutSaved();
          }

          appStoreActions.addConsoleLog({
            level: 'info',
            source: 'api',
            message: 'Layout saved.',
          });
        })
        .catch((error: unknown) => {
          appStoreActions.addConsoleLog({
            level: 'error',
            source: 'api',
            message: formatLayoutSaveError(error),
          });
        });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [layoutDraft, projectId]);

  return (
    <div className="workspace-shell">
      <TopBar
        projectId={projectId}
        projectName={project?.project.name}
        activeView={activeView}
        isRefreshing={isRefreshingProject}
        onRefresh={handleRefresh}
      />
      <div className={usesWorkspaceSidebars ? 'workspace-grid' : 'workspace-grid workspace-grid-full'}>
        {usesWorkspaceSidebars ? (
          <ExplorerSidebar activeView={activeView} canEditProject={Boolean(project)} />
        ) : null}
        <MainWorkspaceView
          activeView={activeView}
          project={project}
          isLoadingProject={isLoadingProject}
          projectError={projectError}
          onProjectChange={setProject}
        />
        {usesWorkspaceSidebars ? (
          <PropertiesPanel
            activeView={activeView}
            project={project}
            onProjectChange={setProject}
          />
        ) : null}
      </div>
      <BottomPanel project={project} />
      <ModalLayer project={project} onProjectChange={setProject} />
    </div>
  );
}

function mergeLayoutDraft(project: ProjectDto, layoutDraft: LayoutDraftState): ProjectDto {
  return {
    ...project,
    project: {
      ...project.project,
      updatedAt: new Date().toISOString(),
    },
    layout: {
      ...project.layout,
      classDiagram: {
        ...project.layout.classDiagram,
        nodes: mergeNodeLayouts(
          project.layout.classDiagram.nodes,
          layoutDraft.classDiagram.nodes,
        ),
        edges: layoutDraft.classDiagram.edges ?? project.layout.classDiagram.edges,
      },
      objectDiagram: {
        ...project.layout.objectDiagram,
        nodes: mergeNodeLayouts(
          project.layout.objectDiagram.nodes,
          layoutDraft.objectDiagram.nodes,
        ),
        edges: layoutDraft.objectDiagram.edges ?? project.layout.objectDiagram.edges,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

function mergeNodeLayouts(
  projectNodes: ProjectDto['layout']['classDiagram']['nodes'],
  draftNodes: ProjectDto['layout']['classDiagram']['nodes'],
) {
  const nodesByElementId = new Map(projectNodes.map((node) => [node.elementId, node]));

  for (const draftNode of draftNodes) {
    nodesByElementId.set(draftNode.elementId, {
      ...nodesByElementId.get(draftNode.elementId),
      ...draftNode,
    });
  }

  return [...nodesByElementId.values()];
}

function formatLayoutSaveError(error: unknown) {
  if (error instanceof Error) {
    return `Layout could not be saved: ${error.message}`;
  }

  return 'Layout could not be saved.';
}

function formatProjectLoadError(error: unknown) {
  if (error instanceof Error) {
    return `Project could not be refreshed: ${error.message}`;
  }

  return 'Project could not be refreshed.';
}
