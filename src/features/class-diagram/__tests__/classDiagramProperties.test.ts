import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import { parseMultiplicity } from '../properties/multiplicity';
import {
  addAssociation,
  addAttribute,
  addClass,
  addInvariant,
  addOperation,
  updateAssociation,
  updateAssociationEnd,
  updateAttribute,
  updateClass,
  updateInvariant,
  updateOperation,
} from '../properties/projectUpdates';

describe('class diagram property updates', () => {
  it('updates class, attribute and operation properties immutably', () => {
    const project = createProject();
    const renamed = updateClass(project, 'class-user', (umlClass) => ({
      ...umlClass,
      name: 'Member',
    }));
    const withAttribute = updateAttribute(renamed, 'class-user', 'attr-books', {
      type: 'Real',
    });
    const withOperation = updateOperation(withAttribute, 'class-user', 'op-borrow', {
      returnType: 'Boolean',
    });

    expect(project.umlModel.classes[0].name).toBe('User');
    expect(withOperation.umlModel.classes[0]).toMatchObject({
      name: 'Member',
      attributes: [
        { id: 'attr-books', name: 'books', type: 'Real' },
      ],
      operations: [
        { id: 'op-borrow', name: 'borrow', returnType: 'Boolean' },
      ],
    });
  });

  it('updates association names, roles and multiplicities', () => {
    const project = createProject();
    const renamed = updateAssociation(project, 'assoc-borrows', (association) => ({
      ...association,
      name: 'Loans',
    }));
    const updatedEnd = updateAssociationEnd(
      renamed,
      'assoc-borrows',
      'end-books',
      {
        roleName: 'loanedBooks',
        multiplicity: parseMultiplicity('0..*') ?? undefined,
      },
    );

    expect(updatedEnd.umlModel.associations[0]).toMatchObject({
      name: 'Loans',
      ends: [
        { id: 'end-user', roleName: 'borrower' },
        {
          id: 'end-books',
          roleName: 'loanedBooks',
          multiplicity: { lower: 0, upper: null, unbounded: true, raw: '0..*' },
        },
      ],
    });
  });

  it('updates invariant properties', () => {
    const updated = updateInvariant(createProject(), 'inv-max-books', {
      name: 'maxLoans',
      expression: 'self.books <= 3',
    });

    expect(updated.umlModel.invariants[0]).toMatchObject({
      name: 'maxLoans',
      expression: 'self.books <= 3',
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

  it('adds an association with roles and multiplicities', () => {
    const sourceMultiplicity = parseMultiplicity('1');
    const targetMultiplicity = parseMultiplicity('0..*');

    const result = addAssociation(createProject(), {
      name: 'Reservations',
      sourceClassId: 'class-user',
      sourceRoleName: 'member',
      sourceMultiplicity: sourceMultiplicity!,
      targetClassId: 'class-book',
      targetRoleName: 'reservedBooks',
      targetMultiplicity: targetMultiplicity!,
    });

    expect(result.createdId).toMatch(/^assoc-/);
    expect(result.project.umlModel.associations).toHaveLength(2);
    expect(result.project.umlModel.associations[1]).toMatchObject({
      id: result.createdId,
      name: 'Reservations',
      ends: [
        {
          classId: 'class-user',
          roleName: 'member',
          multiplicity: { raw: '1' },
        },
        {
          classId: 'class-book',
          roleName: 'reservedBooks',
          multiplicity: { raw: '0..*' },
        },
      ],
    });
  });

  it('adds an invariant for a context class', () => {
    const result = addInvariant(createProject(), {
      name: 'hasName',
      contextClassId: 'class-user',
      expression: "self.name <> ''",
    });

    expect(result.createdId).toMatch(/^inv-/);
    expect(result.project.umlModel.invariants).toHaveLength(2);
    expect(result.project.umlModel.invariants[1]).toMatchObject({
      id: result.createdId,
      name: 'hasName',
      contextClassId: 'class-user',
      expression: "self.name <> ''",
      enabled: true,
    });
  });

  it('adds attributes and operations to an existing class', () => {
    const withAttribute = addAttribute(createProject(), 'class-book', {
      name: 'title',
      type: 'String',
    });
    const withOperation = addOperation(withAttribute.project, 'class-book', {
      name: 'reserve',
      returnType: 'Boolean',
    });

    expect(withAttribute.createdId).toMatch(/^attr-/);
    expect(withOperation.createdId).toMatch(/^op-/);
    expect(withOperation.project.umlModel.classes[1]).toMatchObject({
      id: 'class-book',
      attributes: [
        {
          id: withAttribute.createdId,
          name: 'title',
          type: 'String',
        },
      ],
      operations: [
        {
          id: withOperation.createdId,
          name: 'reserve',
          returnType: 'Boolean',
          parameters: [],
        },
      ],
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
