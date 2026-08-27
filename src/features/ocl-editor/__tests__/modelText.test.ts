import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api';
import { getEditableModelText, renderUseModelText } from '../modelText';

describe('OCL model text rendering', () => {
  it('uses persisted backend model text when available', () => {
    const project = createLibraryProject({
      modelText: {
        projectId: 'project-library',
        modelText: 'model ImportedLibrary\nclass User\nend\n',
        format: 'USE_MODEL_TEXT',
      },
    });

    expect(getEditableModelText(project)).toBe('model ImportedLibrary\nclass User\nend\n');
  });

  it('renders current UML model text when persisted model text is older than the project', () => {
    const project = createLibraryProject({
      project: {
        id: 'project-library',
        name: 'Library',
        updatedAt: '2026-08-03T10:00:00.000Z',
        sourceFormat: 'use',
      },
      modelText: {
        projectId: 'project-library',
        modelText: 'model ImportedLibrary\nclass OldUser\nend\n',
        format: 'USE_MODEL_TEXT',
        updatedAt: '2026-08-03T09:00:00.000Z',
      },
    });

    expect(getEditableModelText(project)).toContain('class User');
    expect(getEditableModelText(project)).not.toContain('OldUser');
  });

  it('renders a USE-style text document from the current project model', () => {
    expect(renderUseModelText(createLibraryProject())).toContain(
      [
        'model Library',
        '',
        'class User',
        'attributes',
        '  books : Integer',
        'operations',
        '  borrow(book : Book) : Boolean',
        'end',
      ].join('\n'),
    );
    expect(renderUseModelText(createLibraryProject())).toContain(
      [
        'association Borrows between',
        '  User[1] role borrower',
        '  Book[0..*] role borrowedBooks',
        'end',
      ].join('\n'),
    );
    expect(renderUseModelText(createLibraryProject())).toContain(
      ['constraints', 'context User inv maxBooks:', '  self.books <= 5'].join('\n'),
    );
  });
});

function createLibraryProject(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    formatVersion: '1.0',
    project: {
      id: 'project-library',
      name: 'Library',
      sourceFormat: 'use',
    },
    umlModel: {
      classes: [
        {
          id: 'class-user',
          name: 'User',
          attributes: [{ id: 'attr-books', name: 'books', type: 'Integer' }],
          operations: [
            {
              id: 'op-borrow',
              name: 'borrow',
              returnType: 'Boolean',
              parameters: [{ id: 'param-book', name: 'book', type: 'Book' }],
            },
          ],
        },
        {
          id: 'class-book',
          name: 'Book',
          attributes: [],
          operations: [],
        },
      ],
      associations: [
        {
          id: 'assoc-borrows',
          name: 'Borrows',
          ends: [
            {
              id: 'end-user',
              classId: 'class-user',
              roleName: 'borrower',
              multiplicity: { lower: 1, upper: 1, unbounded: false, raw: '1' },
            },
            {
              id: 'end-book',
              classId: 'class-book',
              roleName: 'borrowedBooks',
              multiplicity: { lower: 0, upper: null, unbounded: true, raw: '0..*' },
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
        },
      ],
    },
    objectModel: {
      id: 'snapshot-current',
      objects: [],
      links: [],
    },
    layout: {
      classDiagram: { nodes: [] },
      objectDiagram: { nodes: [] },
    },
    ...overrides,
  };
}
