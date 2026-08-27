export type WorkspaceView = 'class-diagram' | 'object-diagram' | 'ocl';

export interface WorkspaceNavigationItem {
  view: WorkspaceView;
  label: string;
}

export type AppRoute =
  | { kind: 'dashboard' }
  | { kind: 'projects' }
  | { kind: 'workspace'; projectId: string; view: WorkspaceView }
  | { kind: 'not-found' };

export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { view: 'class-diagram', label: 'Class Diagram' },
  { view: 'object-diagram', label: 'Object Diagram' },
  { view: 'ocl', label: 'OCL Editor' },
];

export function getWorkspacePath(projectId: string, view: WorkspaceView) {
  return `/projects/${encodeURIComponent(projectId)}/${view}`;
}

export function matchRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/dashboard') {
    return { kind: 'dashboard' };
  }

  if (pathname === '/projects') {
    return { kind: 'projects' };
  }

  const workspaceMatch = pathname.match(
    /^\/projects\/([^/]+)\/(class-diagram|object-diagram|ocl)$/,
  );

  if (workspaceMatch) {
    return {
      kind: 'workspace',
      projectId: decodeURIComponent(workspaceMatch[1]),
      view: workspaceMatch[2] as WorkspaceView,
    };
  }

  return { kind: 'not-found' };
}
