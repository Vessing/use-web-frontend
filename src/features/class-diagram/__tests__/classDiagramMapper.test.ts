import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import { mapProjectToClassDiagram } from '../classDiagramMapper';

describe('mapProjectToClassDiagram', () => {
  it('maps classes, attributes, operations, invariants and association labels', () => {
    const diagram = mapProjectToClassDiagram(createLibraryProject());

    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.nodes[0]).toMatchObject({
      id: 'class-user',
      type: 'umlClass',
      position: { x: 100, y: 80 },
      data: {
        name: 'User',
        attributes: ['name : String', 'books : Integer'],
        operations: ['borrow(book : Book) : Boolean'],
        invariants: [{ id: 'inv-max-books', label: 'inv: maxBooks' }],
      },
    });
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]).toMatchObject({
      id: 'assoc-borrows',
      type: 'umlAssociation',
      source: 'class-user',
      target: 'class-book',
      data: {
        associationName: 'Borrows',
        sourceEnd: { roleName: 'borrower', multiplicity: '1' },
        targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
      },
    });
  });

  it('skips associations whose class ends cannot be resolved', () => {
    const project = createLibraryProject();
    project.umlModel.associations[0].ends[1].classId = 'class-missing';

    expect(mapProjectToClassDiagram(project).edges).toEqual([]);
  });

  it('uses draft layout positions before saved project layout positions', () => {
    const diagram = mapProjectToClassDiagram(createLibraryProject(), {}, null, {
      nodes: [{ elementId: 'class-user', x: 260, y: 180 }],
      edges: [],
    });

    expect(diagram.nodes[0].position).toEqual({ x: 260, y: 180 });
    expect(diagram.nodes[1].position).toEqual({ x: 460, y: 90 });
  });

  it('maps validation markers to classes, invariants and associations', () => {
    const diagram = mapProjectToClassDiagram(createLibraryProject(), {
      'class-user': [
        {
          errorId: 'error-class-user',
          code: 'UNKNOWN_ATTRIBUTE',
          severity: 'WARNING',
          targetType: 'CLASS',
        },
      ],
      'inv-max-books': [
        {
          errorId: 'error-max-books',
          code: 'TYPE_ERROR',
          severity: 'ERROR',
          targetType: 'INVARIANT',
        },
      ],
      'assoc-borrows': [
        {
          errorId: 'error-multiplicity',
          code: 'MULTIPLICITY_VIOLATION',
          severity: 'ERROR',
          targetType: 'ASSOCIATION',
        },
      ],
    });

    expect(diagram.nodes[0].data).toMatchObject({
      validationState: 'warning',
      validationIssueCount: 1,
      invariants: [
        {
          id: 'inv-max-books',
          validationState: 'error',
          validationIssueCount: 1,
        },
      ],
    });
    expect(diagram.edges[0].data).toMatchObject({
      validationState: 'error',
      validationIssueCount: 1,
    });
  });
});

function createLibraryProject(): ProjectDto {
  return {
    formatVersion: '0.1',
    project: {
      id: 'project-library',
      name: 'Library',
    },
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
              returnType: 'Boolean',
              parameters: [{ id: 'param-book', name: 'book', type: 'Book' }],
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
              navigable: true,
            },
            {
              id: 'end-borrows-book',
              classId: 'class-book',
              roleName: 'borrowedBooks',
              multiplicity: { lower: 0, upper: 5, unbounded: false, raw: '0..5' },
              navigable: true,
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
      classDiagram: {
        nodes: [
          { elementId: 'class-user', x: 100, y: 80 },
          { elementId: 'class-book', x: 460, y: 90 },
        ],
        edges: [],
      },
      objectDiagram: {
        nodes: [],
        edges: [],
      },
    },
  };
}
