import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectDto, ProjectSummaryDto } from '../api';
import { renderWithProviders } from '../test/renderWithProviders';
import { ProjectsPage } from './ProjectsPage';

describe('ProjectsPage', () => {
  it('renders project cards and filters them by name or description', async () => {
    window.history.pushState(null, '', '/projects');

    renderWithProviders(<ProjectsPage getProjects={async () => projectSummaries} />);

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Filter projects' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New Project' })).toBeInTheDocument();
    expect(screen.getByText('Library Catalog')).toBeInTheDocument();
    expect(screen.getByText('Bank ATM')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search projects'), 'books');

    expect(screen.getByText('Library Catalog')).toBeInTheDocument();
    expect(screen.queryByText('Bank ATM')).not.toBeInTheDocument();
  });

  it('opens a listed project and navigates to the class diagram', async () => {
    window.history.pushState(null, '', '/projects');
    const getProject = vi.fn(async (projectId: string) => projectFixture(projectId));

    renderWithProviders(
      <ProjectsPage getProject={getProject} getProjects={async () => projectSummaries} />,
    );

    await screen.findByText('Library Catalog');
    await userEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]);

    expect(getProject).toHaveBeenCalledWith('project-library');
    expect(window.location.pathname).toBe('/projects/project-library/class-diagram');
  });

  it('starts a new project from the all-projects page', async () => {
    window.history.pushState(null, '', '/projects');
    const createProject = vi.fn(async () => projectFixture('project-new'));

    renderWithProviders(
      <ProjectsPage
        createProject={createProject}
        getProjects={async () => projectSummaries}
      />,
    );

    await screen.findByText('Library Catalog');
    await userEvent.click(screen.getByRole('button', { name: '+ New Project' }));
    await userEvent.type(screen.getByLabelText('Project Name'), 'New Model');
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/projects/project-new/class-diagram');
    });
    expect(createProject).toHaveBeenCalledWith({ name: 'New Model' });
  });
});

const projectSummaries: ProjectSummaryDto[] = [
  {
    id: 'project-library',
    name: 'Library Catalog',
    description: 'Books and borrowing',
    updatedAt: '2026-07-22T14:00:00Z',
  },
  {
    id: 'project-bank-atm',
    name: 'Bank ATM',
    description: 'Account withdrawal workflow',
    updatedAt: '2026-07-21T11:30:00Z',
  },
];

function projectFixture(projectId: string): ProjectDto {
  return {
    formatVersion: '0.1',
    project: {
      id: projectId,
      name: 'Library Catalog',
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
  };
}
