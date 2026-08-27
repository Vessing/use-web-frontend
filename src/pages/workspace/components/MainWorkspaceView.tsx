import type { WorkspaceView } from '../../../app/navigation';
import type { ProjectDto } from '../../../api';
import { ClassDiagramView } from '../../../features/class-diagram';
import { OclEditorView } from '../../../features/ocl-editor';
import { ObjectDiagramView } from '../../../features/object-diagram';

const viewTitles: Record<WorkspaceView, string> = {
  'class-diagram': 'Class Diagram',
  'object-diagram': 'Object Diagram',
  ocl: 'OCL Editor',
};

interface MainWorkspaceViewProps {
  activeView: WorkspaceView;
  project: ProjectDto | null;
  isLoadingProject: boolean;
  projectError: string | null;
  onProjectChange: (project: ProjectDto) => void;
}

export function MainWorkspaceView({
  activeView,
  project,
  isLoadingProject,
  projectError,
  onProjectChange,
}: MainWorkspaceViewProps) {
  if (activeView === 'class-diagram') {
    return (
      <main className="workspace-main" aria-labelledby="workspace-view-title">
        <h1 id="workspace-view-title" className="workspace-view-title">
          {viewTitles[activeView]}
        </h1>
        <ClassDiagramView
          project={project}
          isLoading={isLoadingProject}
          error={projectError}
        />
      </main>
    );
  }

  if (activeView === 'object-diagram') {
    return (
      <main className="workspace-main" aria-labelledby="workspace-view-title">
        <h1 id="workspace-view-title" className="workspace-view-title">
          {viewTitles[activeView]}
        </h1>
        <ObjectDiagramView
          project={project}
          isLoading={isLoadingProject}
          error={projectError}
        />
      </main>
    );
  }

  if (activeView === 'ocl') {
    return (
      <main className="workspace-main" aria-labelledby="workspace-view-title">
        <h1 id="workspace-view-title" className="workspace-view-title">
          {viewTitles[activeView]}
        </h1>
        <OclEditorView
          projectId={project?.project.id ?? ''}
          project={project}
          isLoading={isLoadingProject}
          error={projectError}
          onProjectChange={onProjectChange}
        />
      </main>
    );
  }

  return (
    <main className="workspace-main" aria-labelledby="workspace-view-title">
      <section className="canvas-placeholder">
        <h1 id="workspace-view-title">{viewTitles[activeView]}</h1>
        <p>
          Diese Hauptansicht ist als Route vorbereitet und wird in spaeteren Schritten befuellt.
        </p>
      </section>
    </main>
  );
}
