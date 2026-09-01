import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type DeleteImpactDto, type ProjectDto } from '../../../api';
import { appStoreActions, getAppState } from '../../../state';
import { ModelTypeDeleteDialog } from './ModelTypeDeleteDialog';

describe('F10N model type delete dialog', () => {
  beforeEach(() => {
    appStoreActions.reset();
    vi.restoreAllMocks();
  });

  it('renders blockers with source locations and navigates to their owner', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact({
      blocked: true,
      references: [{ referenceId: 'attribute-ref', elementType: 'ATTRIBUTE', elementId: 'total', elementName: 'Invoice.total', path: 'type', relation: 'USES_DATATYPE', cascadeAllowed: false, sourceRange: { startLine: 4, startColumn: 8, endLine: 4, endColumn: 16 } }],
    }));
    appStoreActions.openModal({ type: 'deleteModelTypeElement', targetKind: 'DATATYPE', elementId: 'money', elementName: 'billing::Money' });

    render(<ModelTypeDeleteDialog modal={getAppState().modal as never} project={project} fallbackRevision="18" onRefreshProject={vi.fn()} />);

    expect(await screen.findByText('References block deletion')).toBeInTheDocument();
    expect(screen.getByText(/source 4:8/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete DataType' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Open attribute' }));
    await waitFor(() => expect(getAppState().selection).toEqual({ view: 'class-diagram', type: 'class', id: 'invoice' }));
  });

  it('deletes a DataType property through B51, reloads, and keeps the success state visible', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDataTypePropertyDeleteImpact').mockResolvedValue(impact());
    const remove = vi.spyOn(modelCommandApi, 'deleteDataTypeProperty').mockResolvedValue({ command: 'DELETE_DATATYPE_PROPERTY', revisionScope: 'MODEL', revision: '19', result: project.umlModel.dataTypes![0], affectedElements: [] });
    const refresh = vi.fn().mockResolvedValue(true);
    const modal = { type: 'deleteModelTypeElement' as const, targetKind: 'DATATYPE_PROPERTY' as const, elementId: 'amount', elementName: 'amount', ownerId: 'money', ownerName: 'billing::Money', position: 1, total: 1 };

    render(<ModelTypeDeleteDialog modal={modal} project={project} fallbackRevision="17" onRefreshProject={refresh} />);
    await user.click(await screen.findByRole('button', { name: 'Delete Value Property' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('project', 'money', 'amount', { expectedRevision: '18', cascadeReferenceIds: [] }));
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText('Value Property deleted')).toBeInTheDocument();
    expect(screen.getByText(/model revision 19/)).toBeInTheDocument();
  });

  it('keeps the dialog open and adopts current impact after a revision conflict', async () => {
    const user = userEvent.setup();
    const currentImpact = impact({ revision: '20', blocked: true, references: [{ referenceId: 'object-ref', elementType: 'OBJECT', elementId: 'invoice-42', elementName: 'invoice42', path: 'status', relation: 'USES_LITERAL', cascadeAllowed: false }] });
    const load = vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValueOnce(impact()).mockResolvedValueOnce(currentImpact);
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockRejectedValue(new ApiClientError(409, { code: 'STALE_MODEL_REVISION', message: 'stale', userMessage: 'The model changed.', timestamp: '2026-09-01', details: { draft: { expectedRevision: '18', enumerationId: 'status' } } }));
    const modal = { type: 'deleteModelTypeElement' as const, targetKind: 'ENUMERATION_LITERAL' as const, elementId: 'paid', elementName: 'paid', ownerId: 'status', ownerName: 'InvoiceStatus' };

    render(<ModelTypeDeleteDialog modal={modal} project={project} fallbackRevision="17" onRefreshProject={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Delete Literal' }));

    expect(remove).toHaveBeenCalledWith('project', 'ENUMERATION_LITERAL', 'paid', { expectedRevision: '18', cascadeReferenceIds: [], enumerationId: 'status' });
    expect(load).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('alert')).toHaveTextContent('STALE_MODEL_REVISION');
    expect(screen.getByText('invoice42')).toBeInTheDocument();
    expect(screen.getByText('Model revision 20')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a structured not-found error when the target disappeared before impact loading', async () => {
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockRejectedValue(new ApiClientError(404, {
      code: 'ELEMENT_NOT_FOUND',
      message: 'missing',
      userMessage: 'The Enumeration no longer exists.',
      timestamp: '2026-09-01',
      details: { elementType: 'ENUMERATION', elementId: 'status' },
    }));
    const modal = { type: 'deleteModelTypeElement' as const, targetKind: 'ENUMERATION' as const, elementId: 'status', elementName: 'InvoiceStatus' };

    render(<ModelTypeDeleteDialog modal={modal} project={project} fallbackRevision="18" onRefreshProject={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('ELEMENT_NOT_FOUND: The Enumeration no longer exists.');
    expect(screen.getByRole('button', { name: 'Delete Enumeration' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

function impact(overrides: Partial<DeleteImpactDto> = {}): DeleteImpactDto {
  return {
    revisionScope: 'MODEL',
    revision: '18',
    target: { referenceId: 'target', elementType: 'DATATYPE', elementId: 'money', elementName: 'Money', relation: 'TARGET', cascadeAllowed: false },
    references: [],
    blocked: false,
    ...overrides,
  };
}

const project: ProjectDto = {
  formatVersion: '1',
  project: { id: 'project', name: 'Billing' },
  umlModel: {
    primitiveTypes: ['String', 'Integer', 'Real', 'Boolean'],
    classes: [{ id: 'invoice', name: 'Invoice', attributes: [{ id: 'total', name: 'total', type: 'Money' }], operations: [] }],
    associations: [], invariants: [], enumerations: [{ id: 'status', name: 'InvoiceStatus', literals: ['paid'], literalDefinitions: [{ id: 'paid', name: 'paid' }] }],
    dataTypes: [{ id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }] }],
  },
  objectModel: { objects: [{ id: 'invoice-42', name: 'invoice42', classId: 'invoice', slots: [] }], links: [] },
  layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
};
