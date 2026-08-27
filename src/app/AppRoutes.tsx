import { useCurrentPath } from './browserRouter';
import { matchRoute } from './navigation';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { WorkspaceLayout } from '../pages/workspace/WorkspaceLayout';

export function AppRoutes() {
  const route = matchRoute(useCurrentPath());

  if (route.kind === 'dashboard') {
    return <DashboardPage />;
  }

  if (route.kind === 'projects') {
    return <ProjectsPage />;
  }

  if (route.kind === 'workspace') {
    return <WorkspaceLayout projectId={route.projectId} activeView={route.view} />;
  }

  return <NotFoundPage />;
}
