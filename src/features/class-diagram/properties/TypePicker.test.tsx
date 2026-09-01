import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDto } from '../../../api';
import { TypePicker } from './TypePicker';

describe('TypePicker F10N', () => {
  it('builds a nested Sequence of Tuple type through structured controls', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <TypePicker
        project={project}
        label="Attribute type"
        value="String"
        allowStructured
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Attribute type'), '__Sequence__');
    expect(onChange).toHaveBeenLastCalledWith('Sequence(String)');

    rerender(
      <TypePicker
        project={project}
        label="Attribute type"
        value="Sequence(String)"
        allowStructured
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Attribute type element type'), '__tuple__');
    expect(onChange).toHaveBeenLastCalledWith('Sequence(Tuple(field:String))');

    rerender(
      <TypePicker
        project={project}
        label="Attribute type"
        value="Sequence(Tuple(field:String))"
        allowStructured
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Attribute type element type field 1 name'), {
      target: { value: 'amount' },
    });
    expect(onChange).toHaveBeenLastCalledWith('Sequence(Tuple(amount:String))');
  });
});

const project: ProjectDto = {
  formatVersion: '1',
  project: { id: 'project', name: 'Types' },
  umlModel: {
    primitiveTypes: ['String', 'Integer', 'Real', 'Boolean'],
    classes: [],
    associations: [],
    invariants: [],
    dataTypes: [
      { id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }] },
    ],
  },
  objectModel: { objects: [], links: [] },
  layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
};
