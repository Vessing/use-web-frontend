import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectDto, ProjectReadModelDto } from '../../../api/dtos';
import { appStoreActions, getAppState } from '../../../state';
import { ClassPropertiesPanel } from './ClassPropertiesPanel';

const { updateClassMock } = vi.hoisted(() => ({ updateClassMock: vi.fn() }));

vi.mock('../../../api', async () => {
  const actual = await vi.importActual<typeof import('../../../api')>('../../../api');
  return {
    ...actual,
    modelCommandApi: {
      ...actual.modelCommandApi,
      updateClass: updateClassMock,
    },
  };
});

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
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Attributes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Generalizations' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Definitions' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Class ID')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Attributes' }));
    expect(screen.getByRole('button', { name: 'Add Attribute' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Operations' }));
    expect(screen.getByRole('button', { name: 'Add Operation' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Association' }));

    expect(screen.getByRole('button', { name: /Borrows/ })).toHaveTextContent(
      'User.borrower [1] - Book.borrowedBooks [0..5]',
    );
    expect(screen.queryByRole('button', { name: 'Delete Association' })).not.toBeInTheDocument();
    expect(screen.getByText(/revision-protected Association Properties workflow/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Borrows/ }));

    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'association',
      id: 'assoc-borrows',
    });
    expect(onProjectChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('tab', { name: 'Invariant' }));

    expect(screen.getByRole('button', { name: /maxBooks/ })).toHaveTextContent(
      'self.books <= 5',
    );
    expect(screen.queryByRole('button', { name: 'Delete Invariant' })).not.toBeInTheDocument();
    expect(screen.getByText(/revision-protected Invariant Properties workflow/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /maxBooks/ }));

    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'invariant',
      id: 'inv-max-books',
    });
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('shows backend-projected supertypes and inherited features as read-only', async () => {
    const project = createProject();
    project.umlModel.classes[0].superClassIds = ['class-book'];

    render(
      <ClassPropertiesPanel
        project={project}
        umlClass={project.umlModel.classes[0]}
        readModel={createReadModel()}
        onProjectChange={vi.fn()}
        onRefreshProject={vi.fn().mockResolvedValue(true)}
      />,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Generalizations' }));

    expect(screen.getByLabelText('Generalization')).toHaveValue('class-book');
    expect(screen.getByRole('button', { name: 'Add Generalization' })).toBeInTheDocument();
    expect(screen.getByLabelText('Inheritance chain')).toHaveValue('User → Book');
    expect(screen.getByRole('heading', { name: 'Inherited Attributes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inherited Operations' })).toBeInTheDocument();
    expect(screen.getByText('title : String')).toBeInTheDocument();
    expect(screen.getByText('Inherited from Book · read-only')).toBeInTheDocument();
    expect(screen.getByText('No inherited operations for the selected generalization.')).toBeInTheDocument();
  });

  it('moves a class through the revision-protected command and refreshes the explorer projection', async () => {
    const project = createProject();
    project.umlModel.packages = [{ id: 'package-people', qualifiedName: 'university::people' }];
    const onRefreshProject = vi.fn().mockResolvedValue(true);
    updateClassMock.mockResolvedValue({ revision: 'revision-19' });

    render(
      <ClassPropertiesPanel
        project={project}
        umlClass={project.umlModel.classes[0]}
        readModel={createReadModel()}
        onProjectChange={vi.fn()}
        onRefreshProject={onRefreshProject}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Package / Namespace'), 'package-people');

    await waitFor(() => expect(updateClassMock).toHaveBeenCalledWith(
      'project-library',
      'class-user',
      expect.objectContaining({
        expectedRevision: 'revision-18',
        draft: expect.objectContaining({ packageId: 'package-people' }),
      }),
    ));
    expect(onRefreshProject).toHaveBeenCalledOnce();
  });
});

function createReadModel(): ProjectReadModelDto {
  const book = { id: 'class-book', name: 'Book', qualifiedName: 'Book', kind: 'CLASS' };
  return {
    projectId: 'project-library',
    modelId: 'model-library',
    snapshotId: 'snapshot-current',
    readVersion: 'revision-18',
    capabilities: {},
    explorer: [],
    diagnostics: [],
    classes: [{
      id: 'class-user',
      name: 'User',
      qualifiedName: 'User',
      abstractClass: false,
      directSuperClasses: [book],
      generalizationOrder: [book],
      attributes: [{
        id: 'attr-book-title',
        name: 'title',
        qualifiedName: 'Book::title',
        kind: 'ATTRIBUTE',
        type: 'String',
        definingClassifier: book,
        inherited: true,
        derived: false,
        readOnly: true,
        staticFeature: false,
        redefinedFeatures: [],
      }],
      operations: [],
    }],
  };
}

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
