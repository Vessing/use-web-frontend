import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type ProjectDto } from '../../../api';
import { InvariantPropertiesPanel } from './InvariantPropertiesPanel';

afterEach(() => vi.restoreAllMocks());

describe('InvariantPropertiesPanel', () => {
  it('saves the complete draft with a revision and reloads the authoritative projection', async () => {
    const project = fixture();
    const invariant = project.umlModel.invariants[0];
    const update = vi.spyOn(modelCommandApi, 'updateInvariant').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_INVARIANT', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    const refresh = vi.fn().mockResolvedValue(true);
    render(<InvariantPropertiesPanel project={project} invariant={invariant} readVersion="18" onRefreshProject={refresh} />);

    const expression = screen.getByLabelText('Expression');
    await userEvent.clear(expression);
    await userEvent.type(expression, 'self.age >= 19');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', invariant.id, {
      expectedRevision: '18',
      draft: expect.objectContaining({ id: invariant.id, name: invariant.name, contextClassId: invariant.contextClassId, expression: 'self.age >= 19' }),
    });
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('model revision 19');
  });

  it('retains the draft and marks its field after a revision or validation error', async () => {
    const project = fixture();
    const invariant = project.umlModel.invariants[0];
    vi.spyOn(modelCommandApi, 'updateInvariant').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_MODEL_REVISION', message: 'Stale revision.', userMessage: 'Reload before saving.', timestamp: '2026-09-01', details: { currentRevision: '20' }, fieldErrors: { expression: 'Expression must be checked again.' },
    }));
    render(<InvariantPropertiesPanel project={project} invariant={invariant} readVersion="18" onRefreshProject={vi.fn()} />);

    const expression = screen.getByLabelText('Expression');
    await userEvent.clear(expression);
    await userEvent.type(expression, 'self.age >= 21');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText('Expression must be checked again.')).toBeInTheDocument();
    expect(screen.getByText(/Reload before saving/)).toBeInTheDocument();
    expect(expression).toHaveValue('self.age >= 21');
    expect(expression).toHaveAttribute('aria-invalid', 'true');
  });
});

function fixture(): ProjectDto {
  return {
    formatVersion: '1.0', project: { id: 'project-library', name: 'Library' },
    umlModel: {
      classes: [{ id: 'class-person', name: 'Person', qualifiedName: 'people::Person', attributes: [], operations: [] }],
      associations: [],
      invariants: [{ id: 'inv-adult', name: 'Adult', contextClassId: 'class-person', expression: 'self.age >= 18', enabled: true, description: '' }],
    },
    objectModel: { id: 'snapshot', objects: [], links: [] },
    layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
  };
}
