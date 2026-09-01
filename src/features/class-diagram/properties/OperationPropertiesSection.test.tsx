import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type DeleteImpactDto, type ProjectDto } from '../../../api';
import { appStoreActions, getAppState } from '../../../state';
import { OperationPropertiesSection } from './OperationPropertiesSection';

afterEach(() => {
  vi.restoreAllMocks();
  appStoreActions.reset();
});

describe('OperationPropertiesSection', () => {
  it('saves the complete ordered signature and reloads the authoritative projection', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updateOperation').mockResolvedValue({ command: 'UPDATE_OPERATION', revisionScope: 'MODEL', revision: '19', result: operation, affectedElements: [] });
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={refresh} />);

    await user.clear(screen.getByLabelText(/^Name/));
    await user.type(screen.getByLabelText(/^Name/), 'renamed');
    await user.click(screen.getByRole('button', { name: 'Add Parameter' }));
    await user.type(screen.getByLabelText(/^Parameter 1 name/), 'amount');
    await user.selectOptions(screen.getByLabelText('Type'), 'Integer');
    await user.selectOptions(screen.getByLabelText('Direction'), 'INOUT');
    await user.click(screen.getByRole('button', { name: 'Save Operation' }));

    expect(update).toHaveBeenCalledWith('project-1', 'class-account', 'operation-balance', expect.objectContaining({ expectedRevision: '18', draft: expect.objectContaining({ name: 'renamed', parameters: [expect.objectContaining({ name: 'amount', type: 'Integer', direction: 'INOUT', position: 0 })] }) }));
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText('Operation saved at model revision 19.')).toBeInTheDocument();
  });

  it('retains the complete draft and marks the backend target after validation failure', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'updateOperation').mockRejectedValue(new ApiClientError(400, { code: 'OPERATION_PARAMETER_CONFLICT', message: 'conflict', userMessage: 'Names must be unique.', timestamp: '2026-01-01', details: { field: 'parameters.parameter-one' } }));
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);
    await user.clear(screen.getByLabelText(/^Name/));
    await user.type(screen.getByLabelText(/^Name/), 'draftName');
    await user.click(screen.getByRole('button', { name: 'Add Parameter' }));
    await user.type(screen.getByLabelText(/^Parameter 1 name/), 'amount');
    await user.click(screen.getByRole('button', { name: 'Save Operation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('OPERATION_PARAMETER_CONFLICT');
    expect(screen.getByLabelText(/^Name/)).toHaveValue('draftName');
    expect(screen.getByLabelText(/^Parameter 1 name/)).toHaveValue('amount');
  });

  it('deletes an operation without an owner id and reloads the authoritative projection', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact());
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockResolvedValue({
      command: 'DELETE_OPERATION', revisionScope: 'MODEL', revision: '19', result: null,
      affectedElements: [
        { referenceId: 'target:operation:operation-balance', elementType: 'OPERATION', elementId: 'operation-balance', elementName: 'balance', relation: 'TARGET', cascadeAllowed: false },
        { referenceId: 'owner:class:class-account', elementType: 'CLASS', elementId: 'class-account', elementName: 'Account', relation: 'OWNS_DELETED_OPERATION', cascadeAllowed: false },
      ],
    });
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={refresh} />);

    await user.click(screen.getByRole('button', { name: 'Delete Operation' }));
    expect(await screen.findByText('Defined by Account.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Delete Operation' }).at(-1)!);

    expect(remove).toHaveBeenCalledWith('project-1', 'OPERATION', 'operation-balance', {
      expectedRevision: '18', cascadeReferenceIds: [],
    });
    expect(remove.mock.calls[0][3]).not.toHaveProperty('classId');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Operation deleted at model revision 19.')).toBeInTheDocument();
    expect(screen.getByLabelText('Operation')).toHaveValue('__new__');
    expect(getAppState().selection).toEqual({ view: 'class-diagram', type: 'class', id: 'class-account' });
  });

  it('keeps a backend blocker visible and navigates through its stable element reference', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact({
      blocked: true,
      references: [{ referenceId: 'invariant:positive:OPERATION', elementType: 'INVARIANT', elementId: 'invariant-positive', elementName: 'Positive balance', path: 'expression', relation: 'REFERENCES_OPERATION', cascadeAllowed: false }],
    }));
    const remove = vi.spyOn(modelCommandApi, 'deleteElement');
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Operation' }));
    expect(await screen.findByText('Positive balance')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete Operation' }).at(-1)).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Go to element' }));

    expect(remove).not.toHaveBeenCalled();
    await waitFor(() => expect(getAppState().selection).toEqual({ view: 'class-diagram', type: 'invariant', id: 'invariant-positive' }));
    expect(screen.queryByRole('dialog', { name: 'Delete Operation' })).not.toBeInTheDocument();
  });

  it('retains the dialog and adopts current impact after a revision conflict', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue(impact());
    vi.spyOn(modelCommandApi, 'deleteElement').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_MODEL_REVISION', message: 'stale', userMessage: 'The model changed.', timestamp: '2026-08-31',
      details: { draft: { expectedRevision: '18', cascadeReferenceIds: [] }, currentImpact: impact({ revision: '19', blocked: true, references: [{ referenceId: 'operation:audited:OPERATION', elementType: 'OPERATION', elementId: 'operation-balance', elementName: 'audited use', path: 'bodyExpression', relation: 'REFERENCES_OPERATION', cascadeAllowed: false }] }) },
    }));
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Operation' }));
    await user.click((await screen.findAllByRole('button', { name: 'Delete Operation' })).at(-1)!);

    expect(await screen.findByRole('alert')).toHaveTextContent('STALE_MODEL_REVISION');
    expect(screen.getByText('audited use')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Delete Operation' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete Operation' }).at(-1)).toBeDisabled();
  });

  it('shows structured not found from delete impact and does not offer delete', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockRejectedValue(new ApiClientError(404, {
      code: 'ELEMENT_NOT_FOUND', message: 'missing', userMessage: 'The operation no longer exists.', timestamp: '2026-08-31',
      details: { elementType: 'OPERATION', elementId: 'operation-balance', target: { elementType: 'OPERATION', elementId: 'operation-balance' } },
    }));
    const remove = vi.spyOn(modelCommandApi, 'deleteElement');
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Operation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ELEMENT_NOT_FOUND');
    expect(screen.getAllByRole('button', { name: 'Delete Operation' }).at(-1)).toBeDisabled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('creates and persists a complete precondition draft through the operation command', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updateOperation').mockResolvedValue({ command: 'UPDATE_OPERATION', revisionScope: 'MODEL', revision: '19', result: operation, affectedElements: [] });
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={refresh} />);

    await user.click(screen.getByRole('tab', { name: /^Preconditions/ }));
    await user.click(screen.getByRole('button', { name: 'Add precondition' }));
    await user.type(screen.getByLabelText('Name'), 'PositiveBalance');
    await user.type(screen.getByLabelText('OCL expression'), 'self.balance() >= 0');
    await user.click(screen.getByRole('button', { name: 'Save Contract' }));

    expect(update).toHaveBeenCalledWith('project-1', 'class-account', 'operation-balance', expect.objectContaining({
      expectedRevision: '18',
      draft: expect.objectContaining({ contracts: [expect.objectContaining({ name: 'PositiveBalance', kind: 'PRE', expression: 'self.balance() >= 0', enabled: true })] }),
    }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Operation saved at model revision 19.')).toBeInTheDocument();
  });

  it('retains a rejected postcondition draft and marks its expression', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'updateOperation').mockRejectedValue(new ApiClientError(400, { code: 'OPERATION_CONTRACT_INVALID', message: 'invalid', userMessage: 'result is unavailable.', timestamp: '2026-08-31', details: { field: 'contracts' } }));
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    await user.click(screen.getByRole('tab', { name: /^Postconditions/ }));
    await user.click(screen.getByRole('button', { name: 'Add postcondition' }));
    await user.type(screen.getByLabelText('Name'), 'ResultChanged');
    await user.type(screen.getByLabelText('OCL expression'), 'result = 1');
    await user.click(screen.getByRole('button', { name: 'Save Contract' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('OPERATION_CONTRACT_INVALID');
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('ResultChanged');
    expect(screen.getByRole('textbox', { name: 'OCL expression' })).toHaveValue('result = 1');
    expect(screen.getByRole('textbox', { name: 'OCL expression' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('requires confirmation before removing a persisted contract from the full draft', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(modelCommandApi, 'updateOperation').mockResolvedValue({ command: 'UPDATE_OPERATION', revisionScope: 'MODEL', revision: '19', result: operation, affectedElements: [] });
    const contractProject: ProjectDto = { ...project, umlModel: { ...project.umlModel, classes: [{ ...project.umlModel.classes[0], operations: [{ ...operation, contracts: [{ id: 'contract-positive', name: 'Positive', kind: 'PRE', expression: 'true', enabled: true }] }] }] } };
    render(<OperationPropertiesSection project={contractProject} umlClass={contractProject.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await user.click(screen.getByRole('tab', { name: 'Preconditions · 1' }));
    await user.click(screen.getByRole('button', { name: 'Delete precondition' }));
    expect(screen.getByRole('alertdialog', { name: 'Delete precondition' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove from draft' }));
    await user.click(screen.getByRole('button', { name: 'Save Contract' }));

    expect(update.mock.calls[0][3].draft.contracts).toEqual([]);
  });

  it('saves and reloads an OCL query body as part of the complete operation draft', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updateOperation').mockResolvedValue({ command: 'UPDATE_OPERATION', revisionScope: 'MODEL', revision: '19', result: { ...operation, bodyExpression: 'self.balance' }, affectedElements: [] });
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={refresh} />);

    await user.click(screen.getByRole('tab', { name: 'Body' }));
    await user.type(screen.getByLabelText('OCL body expression'), 'self.balance');
    await user.click(screen.getByRole('button', { name: 'Save Body' }));

    expect(update).toHaveBeenCalledWith('project-1', 'class-account', 'operation-balance', expect.objectContaining({ expectedRevision: '18', draft: expect.objectContaining({ bodyExpression: 'self.balance', query: true }) }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Operation saved at model revision 19.')).toBeInTheDocument();
  });

  it('retains a rejected body and marks the expression from backend diagnostics', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'updateOperation').mockRejectedValue(new ApiClientError(400, { code: 'OCL_OPERATION_BODY_INVALID', message: 'invalid', userMessage: 'Unknown property.', timestamp: '2026-08-31', details: { field: 'bodyExpression' } }));
    render(<OperationPropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Body' }));
    await user.type(screen.getByLabelText('OCL body expression'), 'self.missing');
    await user.click(screen.getByRole('button', { name: 'Save Body' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('OCL_OPERATION_BODY_INVALID');
    expect(screen.getByLabelText('OCL body expression')).toHaveValue('self.missing');
    expect(screen.getByLabelText('OCL body expression')).toHaveAttribute('aria-invalid', 'true');
  });
});

function impact(overrides: Partial<DeleteImpactDto> = {}): DeleteImpactDto {
  return {
    revisionScope: 'MODEL', revision: '18', blocked: false,
    target: { referenceId: 'target:operation:operation-balance', elementType: 'OPERATION', elementId: 'operation-balance', elementName: 'balance', relation: 'TARGET', cascadeAllowed: false },
    references: [],
    ...overrides,
  };
}

const operation = { id: 'operation-balance', name: 'balance', returnType: 'Integer', parameters: [], visibility: 'PUBLIC' as const, query: true };
const project: ProjectDto = { formatVersion: '1', project: { id: 'project-1', name: 'Accounts' }, umlModel: { classes: [{ id: 'class-account', name: 'Account', attributes: [], operations: [operation] }], associations: [], invariants: [] }, objectModel: { objects: [], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
