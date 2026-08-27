import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import { mapProjectToObjectDiagram } from '../objectDiagramMapper';

describe('mapProjectToObjectDiagram', () => {
  it('maps objects, slots and object link labels from the project snapshot', () => {
    const diagram = mapProjectToObjectDiagram(createLibraryProject());

    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.nodes[0]).toMatchObject({
      id: 'object-alice',
      type: 'objectNode',
      position: { x: 160, y: 120 },
      data: {
        name: 'alice',
        className: 'User',
        slots: ['name = Alice', 'books = 6'],
      },
    });
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]).toMatchObject({
      id: 'link-borrows-1',
      type: 'objectLink',
      source: 'object-alice',
      target: 'object-moby-dick',
      data: {
        associationName: 'Borrows',
        sourceEnd: { roleName: 'borrower', multiplicity: '1' },
        targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
      },
    });
  });

  it('skips object links whose association ends cannot be resolved', () => {
    const project = createLibraryProject();
    project.objectModel.links[0].endValues = [];

    expect(mapProjectToObjectDiagram(project).edges).toEqual([]);
  });

  it('uses draft layout positions before saved project layout positions', () => {
    const diagram = mapProjectToObjectDiagram(createLibraryProject(), {}, null, {
      nodes: [{ elementId: 'object-alice', x: 300, y: 210 }],
      edges: [],
    });

    expect(diagram.nodes[0].position).toEqual({ x: 300, y: 210 });
    expect(diagram.nodes[1].position).toEqual({ x: 520, y: 140 });
  });

  it('maps validation markers to object nodes and object link edges', () => {
    const diagram = mapProjectToObjectDiagram(createLibraryProject(), {
      'object-alice': [
        {
          errorId: 'error-max-books',
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
          targetType: 'OBJECT',
        },
      ],
      'link-borrows-1': [
        {
          errorId: 'error-invalid-link',
          code: 'INVALID_LINK',
          severity: 'ERROR',
          targetType: 'OBJECT_LINK',
        },
      ],
    });

    expect(diagram.nodes[0].data).toMatchObject({
      validationState: 'error',
      validationIssueCount: 1,
    });
    expect(diagram.edges[0].data).toMatchObject({
      validationState: 'error',
      validationIssueCount: 1,
    });
  });

  it('marks the selected object from validation result focus as selected for the canvas', () => {
    const diagram = mapProjectToObjectDiagram(createLibraryProject(), {}, {
      view: 'object-diagram',
      type: 'object',
      id: 'object-alice',
    });

    expect(diagram.nodes[0].selected).toBe(true);
    expect(diagram.nodes[1].selected).toBe(false);
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
          operations: [],
        },
        {
          id: 'class-book',
          name: 'Book',
          attributes: [
            { id: 'attr-book-title', name: 'title', type: 'String' },
            { id: 'attr-book-available', name: 'available', type: 'Boolean' },
          ],
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
      invariants: [],
    },
    objectModel: {
      id: 'snapshot-current',
      objects: [
        {
          id: 'object-alice',
          name: 'alice',
          classId: 'class-user',
          slots: [
            {
              id: 'slot-alice-name',
              attributeId: 'attr-user-name',
              value: 'Alice',
              valueType: 'String',
            },
            {
              id: 'slot-alice-books',
              attributeId: 'attr-user-books',
              value: 6,
              valueType: 'Integer',
            },
          ],
        },
        {
          id: 'object-moby-dick',
          name: 'mobyDick',
          classId: 'class-book',
          slots: [
            {
              id: 'slot-book-title',
              attributeId: 'attr-book-title',
              value: 'Moby Dick',
              valueType: 'String',
            },
            {
              id: 'slot-book-available',
              attributeId: 'attr-book-available',
              value: false,
              valueType: 'Boolean',
            },
          ],
        },
      ],
      links: [
        {
          id: 'link-borrows-1',
          associationId: 'assoc-borrows',
          endValues: [
            {
              associationEndId: 'end-borrows-user',
              objectId: 'object-alice',
            },
            {
              associationEndId: 'end-borrows-book',
              objectId: 'object-moby-dick',
            },
          ],
        },
      ],
    },
    layout: {
      classDiagram: {
        nodes: [],
        edges: [],
      },
      objectDiagram: {
        nodes: [
          { elementId: 'object-alice', x: 160, y: 120 },
          { elementId: 'object-moby-dick', x: 520, y: 140 },
        ],
        edges: [],
      },
    },
  };
}
