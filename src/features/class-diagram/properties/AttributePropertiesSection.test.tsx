import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type ProjectDto } from '../../../api';
import { AttributePropertiesSection } from './AttributePropertiesSection';

afterEach(() => vi.restoreAllMocks());

describe('AttributePropertiesSection', () => {
  it('persists a derived attribute through the revision-protected command and reloads it', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updateAttribute').mockResolvedValue({ command: 'UPDATE_ATTRIBUTE', revisionScope: 'MODEL', revision: '19', result: { ...attribute, derived: true, deriveExpression: 'self.balance * 2' }, affectedElements: [] });
    render(<AttributePropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={refresh} />);

    await user.click(screen.getByRole('button', { name: 'Derived' }));
    await user.type(screen.getByLabelText('Derive expression'), 'self.balance * 2');
    await user.click(screen.getByRole('button', { name: 'Save Attribute' }));

    expect(update).toHaveBeenCalledWith('project-1', 'class-account', 'attribute-balance', expect.objectContaining({ expectedRevision: '18', draft: expect.objectContaining({ derived: true, deriveExpression: 'self.balance * 2', initExpression: null }) }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Attribute saved at model revision 19.')).toBeInTheDocument();
  });

  it('retains a rejected init draft and marks the backend field', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'updateAttribute').mockRejectedValue(new ApiClientError(400, { code: 'OCL_INIT_EXPRESSION_INVALID', message: 'invalid', userMessage: 'Unknown property.', timestamp: '2026-08-31', details: { field: 'initExpression' } }));
    render(<AttributePropertiesSection project={project} umlClass={project.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Init' }));
    await user.type(screen.getByLabelText('Init expression'), 'self.missing');
    await user.click(screen.getByRole('button', { name: 'Save Attribute' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('OCL_INIT_EXPRESSION_INVALID');
    expect(screen.getByLabelText(/Init expression/)).toHaveValue('self.missing');
    expect(screen.getByLabelText(/Init expression/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('saves a structured static classifier value and marks a rejected nested field', async () => {
    const user = userEvent.setup();
    const typedProject: ProjectDto = { ...project, umlModel: { ...project.umlModel, dataTypes: [{ id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }, { id: 'currency', name: 'currency', type: 'String' }] }], classes: [{ ...project.umlModel.classes[0], attributes: [{ ...attribute, type: 'Money', staticAttribute: true, classifierValue: { type: 'Money', value: { amount: 12, currency: 'EUR' } } }] }] } };
    vi.spyOn(modelCommandApi, 'updateAttribute').mockRejectedValue(new ApiClientError(400, { code: 'STATIC_VALUE_TYPE_MISMATCH', message: 'invalid', userMessage: 'Invalid amount.', timestamp: '', details: { fieldPath: 'classifierValue.value.amount', draft: {} } }));
    render(<AttributePropertiesSection project={typedProject} umlClass={typedProject.umlModel.classes[0]} revision="18" onRefreshProject={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('amount : Real'), { target: { value: '19.5' } });
    await user.click(screen.getByRole('button', { name: 'Save Attribute' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('STATIC_VALUE_TYPE_MISMATCH');
    expect(screen.getByLabelText('amount : Real')).toHaveValue(19.5);
    expect(screen.getByLabelText('amount : Real')).toHaveAttribute('aria-invalid', 'true');
    expect(modelCommandApi.updateAttribute).toHaveBeenCalledWith('project-1', 'class-account', 'attribute-balance', expect.objectContaining({ draft: expect.objectContaining({ classifierValue: { type: 'Money', value: { amount: 19.5, currency: 'EUR' } } }) }));
  });
});

const attribute = { id: 'attribute-balance', name: 'balance', type: 'Integer', derived: false, initExpression: null, deriveExpression: null, visibility: 'PUBLIC' as const };
const project: ProjectDto = { formatVersion: '1', project: { id: 'project-1', name: 'Accounts' }, umlModel: { classes: [{ id: 'class-account', name: 'Account', attributes: [attribute], operations: [] }], associations: [], invariants: [] }, objectModel: { objects: [], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
