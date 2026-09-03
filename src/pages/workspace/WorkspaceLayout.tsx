import { useCallback, useEffect, useRef, useState } from 'react';

import { projectApi, type ProjectDto, type ProjectReadModelDto } from '../../api';
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
  const [readModel, setReadModel] = useState<ProjectReadModelDto | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isRefreshingProject, setIsRefreshingProject] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const layoutDraft = useAppStore((state) => state.layoutDraft);
  const projectRef = useRef<ProjectDto | null>(project);
  const loadRequestRef = useRef(0);
  const usesWorkspaceSidebars = activeView !== 'ocl';

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const loadProject = useCallback(
    async (options?: { showConsoleFeedback?: boolean }) => {
      const requestId = ++loadRequestRef.current;
      setIsLoadingProject(true);
      setProjectError(null);

      try {
        const [loadedProject, loadedReadModel] = await Promise.all([
          projectApi.getProject(projectId),
          projectApi.getProjectReadModel(projectId),
        ]);
        if (requestId !== loadRequestRef.current) {
          return true;
        }
        setProject(loadedProject);
        setReadModel(loadedReadModel);
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
        if (requestId !== loadRequestRef.current) {
          return true;
        }
        setProject(null);
        setReadModel(null);
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
        if (requestId === loadRequestRef.current) {
          setIsLoadingProject(false);
        }
      }
    },
    [projectId],
  );

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
        message: `Saving layout for project "${currentProject.project.name}".`,
      });

      void projectApi
        .saveLayout(projectId, nextProject.layout)
        .then((savedLayout) => {
          setProject((latestProject) => {
            if (!latestProject) {
              return latestProject;
            }
            const updatedProject = { ...latestProject, layout: savedLayout };
            projectRef.current = updatedProject;
            return updatedProject;
          });

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
      <a className="skip-link" href="#workspace-main">Skip to workspace</a>
      <TopBar
        projectId={projectId}
        projectName={project?.project.name}
        activeView={activeView}
        isRefreshing={isRefreshingProject}
        onRefresh={handleRefresh}
      />
      <div
        className={usesWorkspaceSidebars
          ? [
              'workspace-grid',
              !isExplorerOpen ? 'workspace-grid-explorer-collapsed' : '',
              !isPropertiesPanelOpen ? 'workspace-grid-properties-collapsed' : '',
            ].filter(Boolean).join(' ')
          : 'workspace-grid workspace-grid-full'}
      >
        {usesWorkspaceSidebars && isExplorerOpen ? (
          <ExplorerSidebar
            activeView={activeView}
            project={project}
            readModel={readModel}
            isLoading={isLoadingProject}
            error={projectError}
            onCollapse={() => setIsExplorerOpen(false)}
          />
        ) : usesWorkspaceSidebars ? (
          <aside className="workspace-sidebar-rail workspace-sidebar-rail-left" aria-label="Explorer collapsed">
            <button
              type="button"
              className="workspace-sidebar-toggle"
              aria-label="Expand Explorer"
              title="Expand Explorer"
              onClick={() => setIsExplorerOpen(true)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </aside>
        ) : null}
        <MainWorkspaceView
          activeView={activeView}
          project={project}
          isLoadingProject={isLoadingProject}
          projectError={projectError}
          onProjectChange={setProject}
          onRefreshProject={() => loadProject()}
        />
        {usesWorkspaceSidebars && isPropertiesPanelOpen ? (
          <PropertiesPanel
            activeView={activeView}
            project={project}
            readModel={readModel}
            onCollapse={() => setIsPropertiesPanelOpen(false)}
            onProjectChange={setProject}
            onRefreshProject={() => loadProject()}
          />
        ) : usesWorkspaceSidebars ? (
          <aside className="workspace-sidebar-rail workspace-sidebar-rail-right" aria-label="Properties collapsed">
            <button
              type="button"
              className="workspace-sidebar-toggle"
              aria-label="Expand Properties"
              title="Expand Properties"
              onClick={() => setIsPropertiesPanelOpen(true)}
            >
              <span aria-hidden="true">‹</span>
            </button>
          </aside>
        ) : null}
      </div>
      <BottomPanel project={project} diagnostics={readModel?.diagnostics ?? []} />
      <ModalLayer
        project={project}
        readModel={readModel}
        onRefreshProject={() => loadProject()}
      />
    </div>
  );
}

function mergeLayoutDraft(project: ProjectDto, layoutDraft: LayoutDraftState): ProjectDto {
  return {
    ...project,
    layout: {
      ...project.layout,
      classDiagram: {
        ...project.layout.classDiagram,
        nodes: mergeNodeLayouts(project.layout.classDiagram.nodes, layoutDraft.classDiagram.nodes),
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
