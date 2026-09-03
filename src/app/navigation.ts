export type WorkspaceView = 'class-diagram' | 'object-diagram' | 'ocl';

export interface WorkspaceNavigationItem {
  view: WorkspaceView;
  label: string;
}

export type DocRoute =
  | 'introduction'
  | 'workflow'
  | 'imports'
  | 'enumerations'
  | 'datatypes'
  | 'class-diagram'
  | 'class-diagram/properties'
  | 'class-diagram/properties/details'
  | 'class-diagram/properties/attributes'
  | 'class-diagram/properties/operations'
  | 'class-diagram/properties/generalizations'
  | 'class-diagram/properties/definitions'
  | 'class-diagram/associations'
  | 'class-diagram/invariants'
  | 'object-diagram'
  | 'object-diagram/objects'
  | 'object-diagram/object-links'
  | 'object-diagram/operation-invocation';

export type AppRoute =
  | { kind: 'dashboard' }
  | { kind: 'documentation'; docRoute: DocRoute }
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

const validDocRoutes: DocRoute[] = [
  'introduction',
  'workflow',
  'imports',
  'enumerations',
  'datatypes',
  'class-diagram',
  'class-diagram/properties',
  'class-diagram/properties/details',
  'class-diagram/properties/attributes',
  'class-diagram/properties/operations',
  'class-diagram/properties/generalizations',
  'class-diagram/properties/definitions',
  'class-diagram/associations',
  'class-diagram/invariants',
  'object-diagram',
  'object-diagram/objects',
  'object-diagram/object-links',
  'object-diagram/operation-invocation',
];

function matchDocRoute(segment: string): DocRoute {
  const found = validDocRoutes.find((r) => r === segment);
  return found ?? 'introduction';
}

export function matchRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/dashboard') {
    return { kind: 'dashboard' };
  }

  if (pathname === '/projects') {
    return { kind: 'projects' };
  }

  // /docs  ->  introduction
  if (pathname === '/docs') {
    return { kind: 'documentation', docRoute: 'introduction' };
  }

  // /docs/<route>  or  /docs/<parent>/<child>
  const docMatch = pathname.match(/^\/docs\/(.+)$/);
  if (docMatch) {
    return { kind: 'documentation', docRoute: matchDocRoute(docMatch[1]) };
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
