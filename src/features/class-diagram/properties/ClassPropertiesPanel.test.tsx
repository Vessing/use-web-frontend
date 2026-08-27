import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions, getAppState } from '../../../state';
import { ClassPropertiesPanel } from './ClassPropertiesPanel';

afterEach(() => {
  appStoreActions.reset();
});

describe('ClassPropertiesPanel', () => {
  it('provides class-scoped access to related associations and invariants', async () => {
    const project = createProject();
    const onProjectChange = vi.fn();

    render(
      <ClassPropertiesPanel
        project={project}
        umlClass={project.umlModel.classes[0]}
        onProjectChange={onProjectChange}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Class' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Add Attribute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Operation' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Association' }));

    expect(screen.getByRole('button', { name: /Borrows/ })).toHaveTextContent(
      'User.borrower [1] - Book.borrowedBooks [0..5]',
    );
    expect(screen.getByRole('button', { name: 'Delete Association' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Association Name'), {
      target: { value: 'Loans' },
    });
    expect(onProjectChange).toHaveBeenCalledWith(
      expect.objectContaining({
        umlModel: expect.objectContaining({
          associations: [
            expect.objectContaining({
              id: 'assoc-borrows',
              name: 'Loans',
            }),
          ],
        }),
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /Borrows/ }));

    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'association',
      id: 'assoc-borrows',
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Invariant' }));

    expect(screen.getByRole('button', { name: /maxBooks/ })).toHaveTextContent(
      'self.books <= 5',
    );
    expect(screen.getByRole('button', { name: 'Delete Invariant' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('OCL Expression'), {
      target: { value: 'self.books < 10' },
    });
    expect(onProjectChange).toHaveBeenCalledWith(
      expect.objectContaining({
        umlModel: expect.objectContaining({
          invariants: [
            expect.objectContaining({
              id: 'inv-max-books',
              expression: 'self.books < 10',
            }),
          ],
        }),
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /maxBooks/ }));

    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'invariant',
      id: 'inv-max-books',
    });
  });
});

function createProject(): ProjectDto {
  return {
    formatVersion: '0.1',
    project: { id: 'project-library', name: 'Library' },
    umlModel: {
      classes: [
        {
          id: 'class-user',
          name: 'User',
          attributes: [
            { id: 'attr-user-name', name: 'name', type: 'String' },
            { id: 'attr-user-books', name: 'books', type: 'Integer' },
          ],
          operations: [
            {
              id: 'op-user-borrow',
              name: 'borrow',
              returnType: 'Void',
              parameters: [],
            },
          ],
        },
        {
          id: 'class-book',
          name: 'Book',
          attributes: [{ id: 'attr-book-title', name: 'title', type: 'String' }],
          operations: [],
        },
      ],
      associations: [
        {
          id: 'assoc-borrows',
          name: 'Borrows',
          ends: [
            {
              id: 'end-borrows-user',
              classId: 'class-user',
              roleName: 'borrower',
              multiplicity: { lower: 1, upper: 1, unbounded: false, raw: '1' },
            },
            {
              id: 'end-borrows-book',
              classId: 'class-book',
              roleName: 'borrowedBooks',
              multiplicity: { lower: 0, upper: 5, unbounded: false, raw: '0..5' },
            },
          ],
        },
      ],
      invariants: [
        {
          id: 'inv-max-books',
          name: 'maxBooks',
          contextClassId: 'class-user',
          expression: 'self.books <= 5',
          enabled: true,
        },
      ],
    },
    objectModel: {
      id: 'snapshot-current',
      objects: [],
      links: [],
    },
    layout: {
      classDiagram: { nodes: [], edges: [] },
      objectDiagram: { nodes: [], edges: [] },
    },
  };
}
