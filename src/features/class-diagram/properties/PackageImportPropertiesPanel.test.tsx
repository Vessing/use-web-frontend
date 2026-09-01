import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto, ProjectReadModelDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { ImportPropertiesPanel, PackagePropertiesPanel } from './PackageImportPropertiesPanel';

afterEach(() => {
  vi.restoreAllMocks();
  appStoreActions.reset();
});

describe('Package and import command properties', () => {
  it('updates a package with its complete draft and reloads the authoritative projection', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updatePackage').mockResolvedValue({
      command: 'UPDATE_PACKAGE', revisionScope: 'MODEL', revision: '19',
      result: { id: 'people', qualifiedName: 'university::members' }, affectedElements: [],
    });
    render(<PackagePropertiesPanel project={project} readModel={readModel()} umlPackage={project.umlModel.packages![1]} readVersion="18" onRefreshProject={refresh} />);

    const name = screen.getByRole('textbox', { name: 'Package name' });
    await userEvent.clear(name); await userEvent.type(name, 'members');
    await userEvent.click(screen.getByRole('button', { name: 'Save Package' }));

    expect(update).toHaveBeenCalledWith('project-library', 'people', {
      expectedRevision: '18', draft: { id: 'people', qualifiedName: 'university::members' },
    });
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText('Package saved at model revision 19.')).toBeInTheDocument();
  });

  it('keeps an import draft and marks the target field after a structured conflict', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updateImport').mockRejectedValue(new ApiClientError(409, {
      code: 'IMPORT_CYCLE', message: 'Import cycle.', userMessage: 'This import creates a cycle.',
      timestamp: '2026-08-30T12:00:00Z', details: { draft: { importedPackageId: 'university' } },
    }));
    render(<ImportPropertiesPanel project={project} readModel={readModel()} modelImport={project.umlModel.imports![0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.selectOptions(screen.getByLabelText('Imported package'), 'university');
    await userEvent.clear(screen.getByLabelText('Alias')); await userEvent.type(screen.getByLabelText('Alias'), 'campus');
    await userEvent.click(screen.getByRole('button', { name: 'Save Import' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('IMPORT_CYCLE');
    expect(screen.getByRole('combobox', { name: /Imported package/ })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Alias')).toHaveValue('campus');
  });

  it('keeps the complete package draft after a revision conflict', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updatePackage').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_MODEL_REVISION', message: 'Stale model revision.', userMessage: 'The model changed on the server.',
      timestamp: '2026-08-30T12:00:00Z', details: { draft: { id: 'people', qualifiedName: 'university::members' } },
    }));
    render(<PackagePropertiesPanel project={project} readModel={readModel()} umlPackage={project.umlModel.packages![1]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const name = screen.getByRole('textbox', { name: 'Package name' });
    await userEvent.clear(name); await userEvent.type(name, 'members');
    await userEvent.click(screen.getByRole('button', { name: 'Save Package' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('STALE_MODEL_REVISION');
    expect(name).toHaveValue('members');
    expect(screen.getByRole('textbox', { name: 'Qualified name' })).toHaveValue('university::members');
  });

  it.each([
    [400, 'INVALID_PACKAGE'],
    [404, 'ELEMENT_NOT_FOUND'],
  ])('keeps the package draft after HTTP %s with %s', async (status, code) => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updatePackage').mockRejectedValue(new ApiClientError(status, {
      code, message: 'Package command failed.', userMessage: 'The package could not be saved.',
      timestamp: '2026-08-30T12:00:00Z', details: { draft: { id: 'people', qualifiedName: 'university::members' } },
    }));
    render(<PackagePropertiesPanel project={project} readModel={readModel()} umlPackage={project.umlModel.packages![1]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    const name = screen.getByRole('textbox', { name: 'Package name' });
    await userEvent.clear(name); await userEvent.type(name, 'members');
    await userEvent.click(screen.getByRole('button', { name: 'Save Package' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(code);
    expect(name).toHaveValue('members');
  });

  it('requires explicit cascade selection before deleting a package', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue({
      revisionScope: 'MODEL', revision: '18', blocked: true,
      target: { referenceId: 'package-people', elementType: 'PACKAGE', elementId: 'people', elementName: 'university::people', relation: 'TARGET', cascadeAllowed: false },
      references: [{ referenceId: 'class-person', elementType: 'CLASS', elementId: 'person', elementName: 'Person', relation: 'OWNED_BY_PACKAGE', cascadeAllowed: true }],
    });
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockResolvedValue({ command: 'DELETE_PACKAGE', revisionScope: 'MODEL', revision: '19', result: null, affectedElements: [] });
    render(<PackagePropertiesPanel project={project} readModel={readModel()} umlPackage={project.umlModel.packages![1]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Package' }));
    const confirmation = (await screen.findAllByRole('button', { name: 'Delete Package' })).at(-1)!;
    expect(confirmation).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(confirmation).toBeEnabled();
    await userEvent.click(confirmation);
    expect(remove).toHaveBeenCalledWith('project-library', 'PACKAGE', 'people', { expectedRevision: '18', cascadeReferenceIds: ['class-person'] });
  });

  it('removes an import through delete impact and the revision-protected command', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue({
      revisionScope: 'MODEL', revision: '18', blocked: false,
      target: { referenceId: 'import-people-core', elementType: 'IMPORT', elementId: 'people-core', elementName: 'shared', relation: 'TARGET', cascadeAllowed: false },
      references: [],
    });
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockResolvedValue({ command: 'DELETE_IMPORT', revisionScope: 'MODEL', revision: '19', result: null, affectedElements: [] });
    render(<ImportPropertiesPanel project={project} readModel={readModel()} modelImport={project.umlModel.imports![0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove Import' }));
    const confirmation = (await screen.findAllByRole('button', { name: 'Remove Import' })).at(-1)!;
    await userEvent.click(confirmation);

    expect(remove).toHaveBeenCalledWith('project-library', 'IMPORT', 'people-core', { expectedRevision: '18', cascadeReferenceIds: [] });
  });

  it('keeps import deletion blocked while a non-cascade reference remains', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue({
      revisionScope: 'MODEL', revision: '18', blocked: true,
      target: { referenceId: 'import-people-core', elementType: 'IMPORT', elementId: 'people-core', elementName: 'shared', relation: 'TARGET', cascadeAllowed: false },
      references: [{ referenceId: 'definition-count', elementType: 'DEFINITION', elementId: 'definition-count', elementName: 'thingCount', relation: 'REFERENCES_IMPORT', cascadeAllowed: false }],
    });
    render(<ImportPropertiesPanel project={project} readModel={readModel()} modelImport={project.umlModel.imports![0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Import' }));
    expect(await screen.findByText('thingCount')).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: 'Remove Import' })).at(-1)).toBeDisabled();
  });
});

function fixture(): ProjectDto {
  return {
    formatVersion: '1.0', project: { id: 'project-library', name: 'Library', updatedAt: '18' },
    umlModel: { classes: [], associations: [], invariants: [], packages: [{ id: 'university', qualifiedName: 'university' }, { id: 'people', qualifiedName: 'university::people' }, { id: 'core', qualifiedName: 'core' }], imports: [{ id: 'people-core', importingPackageId: 'people', importedPackageId: 'core', alias: 'shared', source: 'core.use', provenance: 'WORKSPACE' }] },
    objectModel: { id: 'snapshot-current', objects: [], links: [] },
    layout: { classDiagram: { nodes: [], edges: [] }, objectDiagram: { nodes: [], edges: [] } },
  };
}

function readModel(): ProjectReadModelDto {
  return { projectId: 'project-library', modelId: 'model', readVersion: '18', capabilities: {}, classes: [], diagnostics: [], explorer: [{ nodeId: 'import-root', elementId: 'people-core', name: 'shared', kind: 'IMPORT_ROOT', imported: true, readOnly: true, importId: 'people-core' }, { nodeId: 'imported-class', parentNodeId: 'import-root', elementId: 'identifier', name: 'Identifier', kind: 'CLASS', imported: true, readOnly: true, importId: 'people-core' }] };
}
