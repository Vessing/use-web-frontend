import type { ProjectDto } from '../../../api';
import type { WorkspaceView } from '../../../app/navigation';
import { ClassDiagramPropertiesPanel } from '../../../features/class-diagram';
import { ObjectDiagramPropertiesPanel } from '../../../features/object-diagram';
import { useAppStore } from '../../../state';

interface PropertiesPanelProps {
  activeView: WorkspaceView;
  project: ProjectDto | null;
  onProjectChange: (project: ProjectDto) => void;
}

export function PropertiesPanel({
  activeView,
  project,
  onProjectChange,
}: PropertiesPanelProps) {
  const selection = useAppStore((state) => state.selection);

  return (
    <aside className="properties-panel" aria-label="Properties Panel">
      <h2>Properties</h2>
      <div className="properties-panel-scroll">
        {activeView === 'class-diagram' ? (
          <ClassDiagramPropertiesPanel
            project={project}
            selection={selection}
            onProjectChange={onProjectChange}
          />
        ) : null}
        {activeView === 'object-diagram' ? (
          <ObjectDiagramPropertiesPanel
            project={project}
            selection={selection}
            onProjectChange={onProjectChange}
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
