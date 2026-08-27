import { navigateTo } from '../../../app/browserRouter';
import {
  getWorkspacePath,
  type WorkspaceView,
  workspaceNavigationItems,
} from '../../../app/navigation';

interface NavigationTabsProps {
  projectId: string;
  activeView: WorkspaceView;
}

export function NavigationTabs({ projectId, activeView }: NavigationTabsProps) {
  return (
    <nav className="navigation-tabs" aria-label="Workspace views">
      {workspaceNavigationItems.map((item) => {
        const path = getWorkspacePath(projectId, item.view);
        const isActive = item.view === activeView;

        return (
          <a
            key={item.view}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? 'navigation-tab active' : 'navigation-tab'}
            href={path}
            onClick={(event) => {
              event.preventDefault();
              navigateTo(path);
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
