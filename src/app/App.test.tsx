import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '../pages/DashboardPage';
import { renderWithProviders } from '../test/renderWithProviders';
import { App } from './App';

describe('App', () => {
  it('renders the dashboard route as the application entry point', () => {
    window.history.pushState(null, '', '/');

    renderWithProviders(<App />);

    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument();
    expect(screen.getByText('USE')).toBeInTheDocument();
    expect(screen.getByText('UML-based Specification Environment')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create New Model' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Start Project' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open Existing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Projects' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learn & Support' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Documentation/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Examples/ })).toBeInTheDocument();
  });

  it('navigates from dashboard view all to the all-projects route', async () => {
    window.history.pushState(null, '', '/');

    renderWithProviders(<DashboardPage getRecentProjects={emptyRecentProjects} />);

    await userEvent.click(screen.getByRole('link', { name: /View all/ }));

    expect(window.location.pathname).toBe('/projects');
  });

  it('loads recent projects from the backend and opens a selected project', async () => {
    window.history.pushState(null, '', '/');
    const getRecentProjects = vi.fn(async () => [
      {
        id: 'project-university-system',
        name: 'University System',
        description: 'Example project with students and courses.',
        updatedAt: '2026-07-20T08:30:00Z',
        sourceFormat: 'json' as const,
      },
    ]);
    const getProject = vi.fn(async () => ({
      formatVersion: '1.0',
      project: {
        id: 'project-university-system',
        name: 'University System',
      },
      umlModel: {
        classes: [],
        associations: [],
        invariants: [],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [],
        links: [],
      },
      layout: {
        classDiagram: {
          nodes: [],
        },
        objectDiagram: {
          nodes: [],
        },
      },
    }));

    renderWithProviders(
      <DashboardPage getProject={getProject} getRecentProjects={getRecentProjects} />,
    );

    expect(await screen.findByRole('button', { name: 'Open University System' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open University System' }));

    expect(getRecentProjects).toHaveBeenCalledTimes(1);
    expect(getProject).toHaveBeenCalledWith('project-university-system');
    expect(window.location.pathname).toBe('/projects/project-university-system/class-diagram');
  });

  it('starts a named project from the dashboard and navigates to the class diagram', async () => {
    window.history.pushState(null, '', '/');
    const createProject = vi.fn(async () => ({
      formatVersion: '1.0',
      project: {
        id: 'backend-project-id',
        name: 'Library Model',
      },
      umlModel: {
        classes: [],
        associations: [],
        invariants: [],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [],
        links: [],
      },
      layout: {
        classDiagram: {
          nodes: [],
        },
        objectDiagram: {
          nodes: [],
        },
      },
    }));

    renderWithProviders(<DashboardPage createProject={createProject} getRecentProjects={emptyRecentProjects} />);

    await userEvent.click(screen.getByRole('button', { name: '+ Start Project' }));
    await userEvent.type(screen.getByLabelText('Project Name'), '  Library Model  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(createProject).toHaveBeenCalledWith({ name: 'Library Model' });
    expect(window.location.pathname).toBe('/projects/backend-project-id/class-diagram');
  });

  it('rejects blank project names before calling the backend', async () => {
    window.history.pushState(null, '', '/');
    const createProject = vi.fn();

    renderWithProviders(<DashboardPage createProject={createProject} getRecentProjects={emptyRecentProjects} />);

    await userEvent.click(screen.getByRole('button', { name: '+ Start Project' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Project name is required.');
    expect(createProject).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });

  it('shows a create project dialog error when project creation fails', async () => {
    window.history.pushState(null, '', '/');

    renderWithProviders(
      <DashboardPage
        createProject={async () => {
          throw new Error('Backend unavailable');
        }}
        getRecentProjects={emptyRecentProjects}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '+ Start Project' }));
    await userEvent.type(screen.getByLabelText('Project Name'), 'Library Model');
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The project could not be created. Please try again.',
    );
    expect(window.location.pathname).toBe('/');
  });

  it('opens an existing .use file through the backend model text apply flow', async () => {
    window.history.pushState(null, '', '/');
    const createProject = vi.fn(async () => ({
      formatVersion: '0.1',
      project: {
        id: 'imported-project-id',
        name: 'Library',
      },
      umlModel: {
        classes: [],
        associations: [],
        invariants: [],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [],
        links: [],
      },
      layout: {
        classDiagram: {
          nodes: [],
        },
        objectDiagram: {
          nodes: [],
        },
      },
    }));
    const applyModelText = vi.fn(async () => ({
      success: true,
      status: 'APPLIED',
      project: {
        formatVersion: '0.1',
        project: {
          id: 'imported-project-id',
          name: 'Library',
        },
        umlModel: {
          classes: [{ id: 'class-user', name: 'User', attributes: [], operations: [] }],
          associations: [],
          invariants: [],
        },
        objectModel: {
          id: 'snapshot-current',
          objects: [],
          links: [],
        },
        layout: {
          classDiagram: { nodes: [] },
          objectDiagram: { nodes: [] },
        },
      },
      modelText: {
        projectId: 'imported-project-id',
        modelText: 'model Library',
        format: 'USE_MODEL_TEXT',
      },
      diagnostics: [],
      changedElementIds: ['class-user'],
    }));
    const useFile = fileWithText('Library.use', 'model Library\nclass User\nend\n');

    renderWithProviders(
      <DashboardPage
        applyModelText={applyModelText}
        createProject={createProject}
        getRecentProjects={emptyRecentProjects}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open Existing' }));
    await userEvent.upload(screen.getByLabelText('Choose .use file'), useFile);
    await userEvent.click(screen.getByRole('button', { name: 'Open Project' }));

    expect(createProject).toHaveBeenCalledWith({
      name: 'Library',
      description: 'Imported from Library.use',
      template: 'empty',
    });
    expect(applyModelText).toHaveBeenCalledWith(
      'imported-project-id',
      expect.objectContaining({
        modelText: 'model Library\nclass User\nend\n',
        sourceName: 'Library.use',
        sourceFormat: 'use',
        sourceOrigin: 'open-existing',
      }),
    );
    expect(window.location.pathname).toBe('/projects/imported-project-id/class-diagram');
  });

  it('rejects non-use files before calling the backend import flow', async () => {
    window.history.pushState(null, '', '/');
    const createProject = vi.fn();
    const applyModelText = vi.fn();

    renderWithProviders(
      <DashboardPage
        applyModelText={applyModelText}
        createProject={createProject}
        getRecentProjects={emptyRecentProjects}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open Existing' }));
    await userEvent.upload(
      screen.getByLabelText('Choose .use file'),
      fileWithText('model.txt', 'model Library'),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only .use files can be opened in this flow.',
    );
    expect(createProject).not.toHaveBeenCalled();
    expect(applyModelText).not.toHaveBeenCalled();
  });

  it('renders the project workspace shell for class diagram routes', () => {
    window.history.pushState(null, '', '/projects/library-demo/class-diagram');

    renderWithProviders(<App />);

    expect(screen.getByText('library-demo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Class Diagram', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Explorer Sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Properties Panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Bottom Panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Constraints' })).toBeInTheDocument();
  });

  it('renders the OCL editor without explorer and properties sidebars', () => {
    window.history.pushState(null, '', '/projects/library-demo/ocl');

    renderWithProviders(<App />);

    expect(screen.getByRole('heading', { name: 'OCL Editor', level: 1 })).toBeInTheDocument();
    expect(screen.queryByLabelText('Explorer Sidebar')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Properties Panel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bottom Panel')).toBeInTheDocument();
  });

  it('navigates between workspace views via navigation tabs', async () => {
    window.history.pushState(null, '', '/projects/library-demo/class-diagram');

    renderWithProviders(<App />);

    await userEvent.click(screen.getByRole('link', { name: 'Object Diagram' }));

    expect(window.location.pathname).toBe('/projects/library-demo/object-diagram');
    expect(screen.getByRole('heading', { name: 'Object Diagram', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Objects')).toBeInTheDocument();
  });
});

function fileWithText(name: string, text: string) {
  const file = new File([text], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', {
    value: async () => text,
  });
  return file;
}

async function emptyRecentProjects() {
  return [];
}
