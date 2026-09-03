import { AppBrand } from '../../../components/AppBrand';
import type { WorkspaceView } from '../../../app/navigation';
import { CheckConstraintsButton } from './CheckConstraintsButton';
import { NavigationTabs } from './NavigationTabs';
import { WorkspaceHelp } from './WorkspaceHelp';

interface TopBarProps {
  projectId: string;
  projectName?: string;
  activeView: WorkspaceView;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

export function TopBar({
  projectId,
  projectName,
  activeView,
  isRefreshing = false,
  onRefresh,
}: TopBarProps) {
  const displayName = projectName?.trim() || 'Project';

  return (
    <header className="top-bar">
      <AppBrand compact />
      <div className="top-bar-project">
        <p className="top-bar-label">Project</p>
        <strong title={projectId}>{displayName}</strong>
      </div>
      <NavigationTabs projectId={projectId} activeView={activeView} />
      <div className="top-bar-actions" aria-label="Global actions">
        <WorkspaceHelp activeView={activeView} />
        <button
          type="button"
          className="icon-button"
          aria-label="Refresh project"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <CheckConstraintsButton projectId={projectId} projectName={displayName} />
      </div>
    </header>
  );
}
