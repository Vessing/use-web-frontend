import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type ProjectDto } from '../../../api';
import { InvariantDeleteDialog } from './InvariantDeleteDialog';

describe('InvariantDeleteDialog', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads impact and deletes through the revision-protected command', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact());
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockResolvedValue({
      command: 'DELETE_INVARIANT', revisionScope: 'MODEL', revision: '19', result: null, affectedElements: [],
    });
    const refresh = vi.fn(async () => true);

    render(<InvariantDeleteDialog project={project()} invariant={project().umlModel.invariants[0]} fallbackRevision="17" onCancel={vi.fn()} onRefreshProject={refresh} />);
    await user.click(await screen.findByRole('button', { name: 'Delete Invariant' }));

    expect(remove).toHaveBeenCalledWith('project-library', 'INVARIANT', 'inv-valid-name', { expectedRevision: '18', cascadeReferenceIds: [] });
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps the dialog open and adopts current impact after a revision conflict', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact());
    vi.spyOn(modelCommandApi, 'deleteElement').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_MODEL_REVISION', message: 'Stale model revision.', userMessage: 'Reload the current impact.', timestamp: '2026-09-01',
      details: { currentImpact: impact({ revision: '20' }) },
    }));

    render(<InvariantDeleteDialog project={project()} invariant={project().umlModel.invariants[0]} fallbackRevision="17" onCancel={vi.fn()} onRefreshProject={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Delete Invariant' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('STALE_MODEL_REVISION');
    expect(screen.getByRole('button', { name: 'Delete Invariant' })).toBeEnabled();
  });
});

function impact(overrides: Record<string, unknown> = {}) {
  return {
    revisionScope: 'MODEL' as const,
    revision: '18',
    target: { referenceId: 'inv-valid-name', elementType: 'INVARIANT', elementId: 'inv-valid-name', elementName: 'ValidName', relation: 'TARGET', cascadeAllowed: false },
    references: [],
    blocked: false,
    ...overrides,
  };
}

function project(): ProjectDto {
  return {
    formatVersion: '1.0',
    project: { id: 'project-library', name: 'Library' },
    umlModel: {
      classes: [{ id: 'class-person', name: 'Person', qualifiedName: 'library::Person', attributes: [], operations: [] }],
      associations: [],
      invariants: [{ id: 'inv-valid-name', name: 'ValidName', contextClassId: 'class-person', expression: 'not self.name.oclIsUndefined()' }],
    },
    objectModel: { id: 'snapshot', objects: [], links: [] },
    layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
  };
}
