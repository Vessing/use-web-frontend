import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { ClassDiagramModals } from './ClassDiagramModals';

afterEach(() => {
  vi.restoreAllMocks();
  appStoreActions.reset();
});

describe('F3N package and import modals', () => {
  it('creates a nested package through the revision-protected command and reloads', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createPackage').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_PACKAGE', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addPackage' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={refresh} />);

    await userEvent.type(screen.getByLabelText('Package name'), 'courses');
    await userEvent.selectOptions(screen.getByLabelText('Parent package'), 'university');
    await userEvent.click(screen.getByRole('button', { name: 'Create Package' }));

    expect(create).toHaveBeenCalledWith('project-library', {
      expectedRevision: '18',
      draft: expect.objectContaining({ qualifiedName: 'university::courses' }),
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('sends every editable import field in one command draft', async () => {
    const project = fixture();
    const create = vi.spyOn(modelCommandApi, 'createImport').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_IMPORT', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addImport' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.selectOptions(screen.getByLabelText('Target package'), 'people');
    await userEvent.selectOptions(screen.getByLabelText('Imported package'), 'core');
    await userEvent.type(screen.getByLabelText('Alias (optional)'), 'shared');
    await userEvent.type(screen.getByLabelText('Source (optional)'), 'core.use');
    await userEvent.click(screen.getByRole('button', { name: 'Add Import' }));

    expect(create).toHaveBeenCalledWith('project-library', {
      expectedRevision: '18',
      draft: expect.objectContaining({ importingPackageId: 'people', importedPackageId: 'core', alias: 'shared', source: 'core.use', provenance: 'WORKSPACE' }),
    });
  });

  it('shows an empty disabled import state when fewer than two packages exist', () => {
    const project = fixture();
    project.umlModel.packages = project.umlModel.packages!.slice(0, 1);
    render(<ClassDiagramModals modal={{ type: 'addImport' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByText('At least two packages are required.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Import' })).toBeDisabled();
  });

  it('shows a loading state while an import command is pending', async () => {
    const project = fixture();
    let finish!: () => void;
    vi.spyOn(modelCommandApi, 'createImport').mockImplementation((_projectId, request) => new Promise((resolve) => {
      finish = () => resolve({ command: 'CREATE_IMPORT', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] });
    }));
    render(<ClassDiagramModals modal={{ type: 'addImport' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Import' }));
    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled();
    await act(async () => finish());
  });
});

describe('F11 invariant modal', () => {
  it('creates the complete invariant draft through the model command and reloads', async () => {
    const project = fixture();
    project.umlModel.classes = [{ id: 'class-person', name: 'Person', qualifiedName: 'people::Person', attributes: [], operations: [] }];
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createInvariant').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_INVARIANT', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addInvariant', contextClassId: 'class-person' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={refresh} />);

    await userEvent.type(screen.getByLabelText('Invariant Name'), 'HasName');
    await userEvent.type(screen.getByLabelText('OCL Expression'), 'not self.name.oclIsUndefined()');
    await userEvent.click(screen.getByRole('button', { name: 'Create Invariant' }));

    expect(create).toHaveBeenCalledWith('project-library', {
      expectedRevision: '18',
      draft: expect.objectContaining({ name: 'HasName', contextClassId: 'class-person', expression: 'not self.name.oclIsUndefined()', enabled: true }),
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps the complete invariant draft visible after backend validation fails', async () => {
    const project = fixture();
    project.umlModel.classes = [{ id: 'class-person', name: 'Person', qualifiedName: 'people::Person', attributes: [], operations: [] }];
    vi.spyOn(modelCommandApi, 'createInvariant').mockRejectedValue(new ApiClientError(422, {
      code: 'INVALID_OCL_EXPRESSION', message: 'Invalid expression.', userMessage: 'The expression cannot be compiled.', timestamp: '2026-09-01', fieldErrors: { expression: 'Unknown property missing.' },
    }));
    render(<ClassDiagramModals modal={{ type: 'addInvariant', contextClassId: 'class-person' }} project={project} expectedRevision="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Invariant Name'), 'Broken');
    await userEvent.type(screen.getByLabelText('OCL Expression'), 'self.missing');
    await userEvent.click(screen.getByRole('button', { name: 'Create Invariant' }));

    expect(await screen.findByText('Unknown property missing.')).toBeInTheDocument();
    expect(screen.getByText(/The expression cannot be compiled/)).toBeInTheDocument();
    expect(screen.getByLabelText('Invariant Name')).toHaveValue('Broken');
    expect(screen.getByLabelText('OCL Expression')).toHaveValue('self.missing');
  });
});

function fixture(): ProjectDto {
  return {
    formatVersion: '1.0', project: { id: 'project-library', name: 'Library', updatedAt: '18' },
    umlModel: { classes: [], associations: [], invariants: [], packages: [{ id: 'university', qualifiedName: 'university' }, { id: 'people', qualifiedName: 'university::people' }, { id: 'core', qualifiedName: 'core' }], imports: [] },
    objectModel: { id: 'snapshot-current', objects: [], links: [] },
    layout: { classDiagram: { nodes: [], edges: [] }, objectDiagram: { nodes: [], edges: [] } },
  };
}
