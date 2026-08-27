import type { ProjectDto } from '../../../api';
import { appStoreActions, useAppStore } from '../../../state';
import { ValidationResultsPanel } from './ValidationResultsPanel';

interface BottomPanelProps {
  project: ProjectDto | null;
}

export function BottomPanel({ project }: BottomPanelProps) {
  const activeTab = useAppStore((state) => state.activeBottomPanelTab);
  const consoleLogs = useAppStore((state) => state.consoleLogs);
  const validation = useAppStore((state) => state.validation);

  return (
    <section className="bottom-panel" aria-label="Bottom Panel">
      <div className="bottom-tabs" role="tablist" aria-label="Bottom panel tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'console'}
          onClick={() => appStoreActions.setActiveBottomPanelTab('console')}
        >
          Console
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'validation-results'}
          onClick={() =>
            appStoreActions.setActiveBottomPanelTab('validation-results')
          }
        >
          Validation Results
        </button>
      </div>
      {activeTab === 'console' ? (
        <div className="bottom-panel-content console-panel-content" role="tabpanel">
          {consoleLogs.length === 0 ? (
            <p>Keine Console-Eintraege vorhanden.</p>
          ) : (
            <ul className="console-log-list">
              {consoleLogs.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.level}</strong> {entry.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="bottom-panel-content validation-panel-content" role="tabpanel">
          <ValidationResultsPanel validation={validation} project={project} />
        </div>
      )}
    </section>
  );
}
