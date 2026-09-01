import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import { parseMultiplicity } from '../properties/multiplicity';
import {
  addAttribute,
  addClass,
  updateAttribute,
  updateClass,
} from '../properties/projectUpdates';

describe('class diagram property updates', () => {
  it('updates class and attribute properties immutably', () => {
    const project = createProject();
    const renamed = updateClass(project, 'class-user', (umlClass) => ({
      ...umlClass,
      name: 'Member',
    }));
    const withAttribute = updateAttribute(renamed, 'class-user', 'attr-books', {
      type: 'Real',
    });
    expect(project.umlModel.classes[0].name).toBe('User');
    expect(withAttribute.umlModel.classes[0]).toMatchObject({
      name: 'Member',
      attributes: [
        { id: 'attr-books', name: 'books', type: 'Real' },
      ],
      operations: [
        { id: 'op-borrow', name: 'borrow', returnType: 'String' },
      ],
    });
  });

  it('rejects invalid multiplicity text', () => {
    expect(parseMultiplicity('2..1')).toBeNull();
    expect(parseMultiplicity('abc')).toBeNull();
  });

  it('adds a class with initial attributes, operations and layout', () => {
    const result = addClass(createProject(), {
      name: 'Loan',
      attributes: [{ name: 'startedAt', type: 'String' }],
      operations: [{ name: 'close', returnType: 'Boolean' }],
      position: { x: 320, y: 180 },
    });

    expect(result.createdId).toMatch(/^class-/);
    expect(result.project.umlModel.classes).toHaveLength(3);
    expect(result.project.umlModel.classes[2]).toMatchObject({
      id: result.createdId,
      name: 'Loan',
      attributes: [{ name: 'startedAt', type: 'String' }],
      operations: [{ name: 'close', returnType: 'Boolean', parameters: [] }],
    });
    expect(result.project.layout.classDiagram.nodes).toContainEqual({
      elementId: result.createdId,
      x: 320,
      y: 180,
    });
  });

  it('adds attributes to an existing class', () => {
    const withAttribute = addAttribute(createProject(), 'class-book', {
      name: 'title',
      type: 'String',
    });
    expect(withAttribute.createdId).toMatch(/^attr-/);
    expect(withAttribute.project.umlModel.classes[1]).toMatchObject({
      id: 'class-book',
      attributes: [
        {
          id: withAttribute.createdId,
          name: 'title',
          type: 'String',
        },
      ],
      operations: [],
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
          attributes: [{ id: 'attr-books', name: 'books', type: 'Integer' }],
          operations: [
            {
              id: 'op-borrow',
              name: 'borrow',
              returnType: 'String',
              parameters: [],
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
              navigable: true,
            },
            {
              id: 'end-books',
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
      classDiagram: { nodes: [], edges: [] },
      objectDiagram: { nodes: [], edges: [] },
    },
  };
}
