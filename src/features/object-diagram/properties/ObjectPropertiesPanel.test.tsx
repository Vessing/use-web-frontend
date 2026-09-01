import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectDto, ProjectReadModelDto } from '../../../api';
import { ObjectPropertiesPanel } from './ObjectPropertiesPanel';
import { ApiClientError, snapshotCommandApi } from '../../../api';

describe('ObjectPropertiesPanel F9 derived values', () => {
  it('renders the authoritative derived value as read-only and distinguishes invalid', () => {
    const { rerender } = render(<ObjectPropertiesPanel project={project} object={object} readModel={readModel('VALUE')} readVersion="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn()} />);

    const value = screen.getByLabelText('doubleBalance derived value');
    expect(within(value).getByText('84')).toBeInTheDocument();
    expect(within(value).queryByRole('textbox')).not.toBeInTheDocument();
    expect(value).toHaveTextContent('read-only');

    rerender(<ObjectPropertiesPanel project={project} object={object} readModel={readModel('INVALID')} readVersion="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn()} />);
    expect(within(screen.getByLabelText('doubleBalance derived value')).getByText('invalid')).toBeInTheDocument();
  });
});

describe('ObjectPropertiesPanel F10 typed slot commands', () => {
  it('keeps the typed draft and saves it through the revision-protected slot command', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(snapshotCommandApi, 'updateSlot').mockResolvedValue({ command: 'UPDATE_SLOT', revisionScope: 'SNAPSHOT', revision: '19', result: { id: 'age-slot', attributeId: 'age', value: { type: 'Integer', value: 42 }, isUnset: false }, affectedElements: [] });
    const refresh = vi.fn().mockResolvedValue(true);
    const storedProject: ProjectDto = { ...project, umlModel: { ...project.umlModel, classes: [{ id: 'account', name: 'Account', attributes: [{ id: 'age', name: 'age', type: 'Integer' }], operations: [] }] }, objectModel: { objects: [{ ...object, slots: [{ id: 'age-slot', attributeId: 'age', value: null, valueType: 'Integer', isUnset: true }] }], links: [] } };
    render(<ObjectPropertiesPanel project={storedProject} object={storedProject.objectModel.objects[0]} readVersion="18" onProjectChange={vi.fn()} onRefreshProject={refresh} />);
    await user.click(screen.getByRole('button', { name: 'Set value' }));
    const input = screen.getByLabelText('age : Integer'); fireEvent.change(input, { target: { value: '42' } });
    await user.click(screen.getByRole('button', { name: 'Save Value' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('project-1', 'account-one', 'age-slot', { expectedRevision: '18', draft: expect.objectContaining({ attributeId: 'age', value: { type: 'Integer', value: 42 }, isUnset: false }) }));
    expect(refresh).toHaveBeenCalled();
  });

  it('retains the typed slot draft after a snapshot revision conflict', async () => {
    const user = userEvent.setup();
    vi.spyOn(snapshotCommandApi, 'updateSlot').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_SNAPSHOT_REVISION', message: 'Stale snapshot', userMessage: 'The snapshot changed.', timestamp: '', details: { draft: {} },
    }));
    const storedProject: ProjectDto = { ...project, umlModel: { ...project.umlModel, classes: [{ id: 'account', name: 'Account', attributes: [{ id: 'age', name: 'age', type: 'Integer' }], operations: [] }] }, objectModel: { objects: [{ ...object, slots: [{ id: 'age-slot', attributeId: 'age', value: null, valueType: 'Integer', isUnset: true }] }], links: [] } };
    render(<ObjectPropertiesPanel project={storedProject} object={storedProject.objectModel.objects[0]} readVersion="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Set value' }));
    const input = screen.getByLabelText('age : Integer');
    fireEvent.change(input, { target: { value: '42' } });
    await user.click(screen.getByRole('button', { name: 'Save Value' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The snapshot changed.');
    expect(input).toHaveValue(42);
  });

  it('keeps a nested DataType draft and maps fieldPath to the rejected field', async () => {
    const user = userEvent.setup();
    vi.spyOn(snapshotCommandApi, 'updateSlot').mockRejectedValue(new ApiClientError(400, {
      code: 'INVALID_SLOT_VALUE', message: 'Invalid value', userMessage: 'Amount is invalid.', timestamp: '', details: { fieldPath: 'value.amount', attributeId: 'total', draft: {} },
    }));
    const storedProject: ProjectDto = { ...project, umlModel: { ...project.umlModel, dataTypes: [{ id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }, { id: 'currency', name: 'currency', type: 'String' }] }], classes: [{ id: 'account', name: 'Account', attributes: [{ id: 'total', name: 'total', type: 'Money' }], operations: [] }] }, objectModel: { objects: [{ ...object, slots: [{ id: 'total-slot', attributeId: 'total', value: { amount: 12, currency: 'EUR' }, valueType: 'Money', isUnset: false }] }], links: [] } };
    render(<ObjectPropertiesPanel project={storedProject} object={storedProject.objectModel.objects[0]} readVersion="18" onProjectChange={vi.fn()} onRefreshProject={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('amount : Real'), { target: { value: '19.5' } });
    await user.click(screen.getByRole('button', { name: 'Save Value' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Amount is invalid.');
    expect(screen.getByLabelText('amount : Real')).toHaveValue(19.5);
    expect(screen.getByLabelText('amount : Real')).toHaveAttribute('aria-invalid', 'true');
  });
});

const attribute = { id: 'double-balance', name: 'doubleBalance', type: 'Integer', derived: true, deriveExpression: 'self.balance * 2' };
const object = { id: 'account-one', name: 'account1', classId: 'account', slots: [] };
const project: ProjectDto = { formatVersion: '1', project: { id: 'project-1', name: 'Accounts' }, umlModel: { classes: [{ id: 'account', name: 'Account', attributes: [attribute], operations: [] }], associations: [], invariants: [] }, objectModel: { objects: [object], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
const namedClass = { id: 'account', name: 'Account', qualifiedName: 'Account', kind: 'CLASS' };
function readModel(status: 'VALUE' | 'INVALID'): ProjectReadModelDto {
  return { projectId: 'project-1', modelId: 'model-1', snapshotId: 'snapshot-1', readVersion: '18', capabilities: {}, explorer: [], classes: [], diagnostics: [], objects: [{ id: 'account-one', name: 'account1', classifier: namedClass, slots: [{ id: 'slot-double-balance', attributeId: 'double-balance', attributeName: 'doubleBalance', type: 'Integer', definingClassifier: namedClass, inherited: false, derived: true, readOnly: true, valueStatus: status, value: status === 'VALUE' ? { status: 'VALUE', type: 'Integer', kind: 'SCALAR', scalar: 84 } : { status: 'INVALID', type: 'Integer', kind: 'INVALID' }, diagnostics: [] }] }] };
}
