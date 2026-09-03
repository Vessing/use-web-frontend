import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, projectApi } from '../../../api';
import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { ClassDiagramModals } from './ClassDiagramModals';

afterEach(() => {
  vi.restoreAllMocks();
  appStoreActions.reset();
});

describe('F3N package and import modals', () => {
  it('creates an association with the selected aggregation kind', async () => {
    const project = fixture();
    project.umlModel.classes = [
      { id: 'class-order', name: 'Order', attributes: [], operations: [] },
      { id: 'class-line', name: 'LineItem', attributes: [], operations: [] },
    ];
    const create = vi.spyOn(modelCommandApi, 'createAssociation').mockImplementation(async (_projectId, request) => ({
      command: 'CREATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [],
    }));

    render(<ClassDiagramModals modal={{ type: 'addClassAssociation' }} project={project} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.type(screen.getByLabelText('Association Name'), 'Contains');
    await userEvent.selectOptions(screen.getByLabelText('End 1 aggregation kind'), 'COMPOSITE');
    await userEvent.click(screen.getByRole('button', { name: 'Create Association' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('project-library', expect.objectContaining({
      expectedRevision: '18',
      draft: expect.objectContaining({
        name: 'Contains',
        ends: expect.arrayContaining([expect.objectContaining({ aggregationKind: 'COMPOSITE' })]),
      }),
    })));
  });

  it('creates a class through the revision-protected command and reloads the explorer projection', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createClass').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_CLASS', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addClass' }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.type(screen.getByLabelText('Class Name'), 'Course');
    await userEvent.click(screen.getByRole('button', { name: 'Create Class' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('project-library', {
      expectedRevision: '18',
      draft: expect.objectContaining({ name: 'Course', attributes: [], operations: [] }),
    }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ['addEnumeration', 'Create Enumeration', 'Status'],
    ['addDataType', 'Create DataType', 'Money'],
  ] as const)('reloads the explorer after creating a model type', async (modalType, submitLabel, name) => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = modalType === 'addEnumeration'
      ? vi.spyOn(modelCommandApi, 'createEnumeration').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_ENUMERATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }))
      : vi.spyOn(modelCommandApi, 'createDataType').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_DATATYPE', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: modalType }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.type(screen.getByLabelText('Name'), name);
    if (modalType === 'addEnumeration') await userEvent.type(screen.getByLabelText('Literal 1'), 'OPEN');
    else await userEvent.type(screen.getByLabelText('Property 1'), 'amount');
    await userEvent.click(screen.getByRole('button', { name: submitLabel }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('creates a nested package through the revision-protected command and reloads', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createPackage').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_PACKAGE', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addPackage' }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.type(screen.getByLabelText('Package name'), 'courses');
    await userEvent.selectOptions(screen.getByLabelText('Parent package'), 'university');
    await userEvent.click(screen.getByRole('button', { name: 'Create Package' }));

    expect(create).toHaveBeenCalledWith('project-library', {
      expectedRevision: '18',
      draft: expect.objectContaining({ qualifiedName: 'university::courses' }),
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('adds source files as all-elements imports and persists the complete bundle', async () => {
    const project = fixture();
    project.modelText = { projectId: 'project-library', modelText: 'import * from "old.use"\nmodel Library\nclass User end\n', format: 'USE_MODEL_TEXT', sourceFiles: [{ sourcePath: 'old.use', text: 'model Old\nclass Old end\n' }] };
    const apply = vi.spyOn(projectApi, 'applyModelText').mockResolvedValue({
      success: true, status: 'APPLIED', project, modelText: project.modelText, diagnostics: [], changedElementIds: [],
    });
    render(<ClassDiagramModals modal={{ type: 'addSourceImport' }} project={project} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    const file = new File(['model Dates\ndataType Date\nend\n'], 'dates.use', { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: async () => 'model Dates\ndataType Date\nend\n' });
    await userEvent.upload(screen.getByLabelText('Choose imported source files'), file);
    expect(screen.getByRole('button', { name: 'Remove imported file old.use' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove imported file dates.use' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove imported file old.use' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply Imports' }));
    await waitFor(() => expect(apply).toHaveBeenCalledWith('project-library', expect.objectContaining({
      modelText: 'import * from "dates.use"\nmodel Library\nclass User end\n',
      sourceFiles: { 'dates.use': 'model Dates\ndataType Date\nend\n' },
      replaceSourceFiles: true,
    })));
    expect(screen.queryByText('Add Package Import')).not.toBeInTheDocument();
  });
});

describe('F11 invariant modal', () => {
  it('creates the complete invariant draft through the model command and reloads', async () => {
    const project = fixture();
    project.umlModel.classes = [{ id: 'class-person', name: 'Person', qualifiedName: 'people::Person', attributes: [], operations: [] }];
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createInvariant').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_INVARIANT', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ClassDiagramModals modal={{ type: 'addInvariant', contextClassId: 'class-person' }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

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
    render(<ClassDiagramModals modal={{ type: 'addInvariant', contextClassId: 'class-person' }} project={project} expectedRevision="18" onRefreshProject={vi.fn()} />);

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
