import type { ProjectDto, ProjectReadModelDto } from '../../../api';
import type { WorkspaceView } from '../../../app/navigation';
import { ClassDiagramPropertiesPanel } from '../../../features/class-diagram';
import { ObjectDiagramPropertiesPanel } from '../../../features/object-diagram';
import { useAppStore } from '../../../state';

interface PropertiesPanelProps {
  activeView: WorkspaceView;
  project: ProjectDto | null;
  readModel: ProjectReadModelDto | null;
  onCollapse: () => void;
  onProjectChange: (project: ProjectDto) => void;
  onRefreshProject: () => Promise<boolean>;
}

export function PropertiesPanel({
  activeView,
  project,
  readModel,
  onCollapse,
  onProjectChange,
  onRefreshProject,
}: PropertiesPanelProps) {
  const selection = useAppStore((state) => state.selection);

  return (
    <aside className="properties-panel" aria-label="Properties Panel">
      <header className="properties-panel-header">
        <h2>Properties</h2>
        <button
          type="button"
          className="workspace-sidebar-toggle"
          aria-label="Collapse Properties"
          title="Collapse Properties"
          onClick={onCollapse}
        >
          <span aria-hidden="true">›</span>
        </button>
      </header>
      <div className="properties-panel-scroll">
        {activeView === 'class-diagram' ? (
          <ClassDiagramPropertiesPanel
            project={project}
            readModel={readModel}
            selection={selection}
            onProjectChange={onProjectChange}
            onRefreshProject={onRefreshProject}
          />
        ) : null}
        {activeView === 'object-diagram' ? (
          <ObjectDiagramPropertiesPanel
            project={project}
            readVersion={readModel?.readVersion ?? ''}
            readModel={readModel}
            selection={selection}
            onProjectChange={onProjectChange}
            onRefreshProject={onRefreshProject}
          />
        ) : null}
        {activeView === 'ocl' ? (
          selection ? (
            <dl>
              <dt>View</dt>
              <dd>{selection.view}</dd>
              <dt>Element</dt>
              <dd>{selection.type}</dd>
              <dt>ID</dt>
              <dd>{selection.id}</dd>
            </dl>
          ) : (
            <p>Kein Diagrammelement ausgewaehlt.</p>
          )
        ) : null}
      </div>
    </aside>
  );
}
