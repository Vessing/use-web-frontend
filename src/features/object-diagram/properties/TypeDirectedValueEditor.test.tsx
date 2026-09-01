import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TypeDirectedValueEditor } from './TypeDirectedValueEditor';
import type { ProjectDto } from '../../../api';

describe('TypeDirectedValueEditor F10', () => {
  it('edits enumeration and structured DataType values without free-text type interpretation', async () => {
    const user = userEvent.setup(); const onChange = vi.fn(); const project = typedProject();
    const { rerender } = render(<TypeDirectedValueEditor project={project} type="Status" label="status" value="OPEN" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('status : Status'), 'CLOSED');
    expect(onChange).toHaveBeenCalledWith('CLOSED');
    rerender(<TypeDirectedValueEditor project={project} type="Money" label="total" value={{ amount: 12, currency: 'EUR' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('amount : Real'), { target: { value: '19.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 19.5, currency: 'EUR' });
  });

  it('preserves Sequence order and exposes null separately', async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    render(<TypeDirectedValueEditor project={typedProject()} type="Sequence(Integer)" label="scores" value={[1, 2]} onChange={onChange} />);
    await user.click(screen.getAllByRole('button', { name: 'Down' })[0]);
    expect(onChange).toHaveBeenCalledWith([2, 1]);
    await user.click(screen.getByRole('button', { name: 'Set null' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('edits nested Tuple fields recursively', async () => {
    const onChange = vi.fn();
    render(<TypeDirectedValueEditor project={typedProject()} type="Tuple(label:String,count:Integer)" label="summary" value={{ label: 'Open', count: 1 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('count : Integer'), { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({ label: 'Open', count: 2 });
  });
});

function typedProject(): ProjectDto { return { formatVersion: '1', project: { id: 'project', name: 'Typed values' }, umlModel: { classes: [], associations: [], invariants: [], enumerations: [{ id: 'status', name: 'Status', literals: ['OPEN', 'CLOSED'], literalDefinitions: [{ id: 'open', name: 'OPEN' }, { id: 'closed', name: 'CLOSED' }] }], dataTypes: [{ id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }, { id: 'currency', name: 'currency', type: 'String' }] }] }, objectModel: { objects: [], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } }; }
