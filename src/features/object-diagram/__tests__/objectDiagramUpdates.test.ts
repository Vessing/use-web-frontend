import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../api/dtos';
import {
  addObject,
  addObjectLink,
  appendObjectLink,
  updateObject,
  updateObjectLinkEnd,
  updateSlotValueByAttribute,
} from '../objectDiagramUpdates';

describe('object diagram updates', () => {
  it('adds an object with unset slots for class attributes and layout', () => {
    const result = addObject(createProject(), {
      name: 'alice',
      classId: 'class-user',
      position: { x: 240, y: 160 },
    });

    expect(result.createdId).toMatch(/^object-/);
    expect(result.project.objectModel.objects).toHaveLength(1);
    expect(result.project.objectModel.objects[0]).toMatchObject({
      id: result.createdId,
      name: 'alice',
      classId: 'class-user',
      slots: [
        {
          attributeId: 'attr-user-name',
          value: null,
          valueType: 'String',
          isUnset: true,
        },
        {
          attributeId: 'attr-user-books',
          value: null,
          valueType: 'Integer',
          isUnset: true,
        },
      ],
    });
    expect(result.project.layout.objectDiagram.nodes).toContainEqual({
      elementId: result.createdId,
      x: 240,
      y: 160,
    });
  });

  it('adds an object link using association ends', () => {
    const project = createProjectWithObjects();
    const result = addObjectLink(project, {
      associationId: 'assoc-borrows',
      sourceObjectId: 'object-alice',
      targetObjectId: 'object-book',
    });

    expect(result.createdId).toMatch(/^link-/);
    expect(result.project.objectModel.links).toHaveLength(1);
    expect(result.project.objectModel.links[0]).toMatchObject({
      id: result.createdId,
      associationId: 'assoc-borrows',
      endValues: [
        { associationEndId: 'end-borrows-user', objectId: 'object-alice' },
        { associationEndId: 'end-borrows-book', objectId: 'object-book' },
      ],
    });
  });

  it('updates object properties and slot values', () => {
    const project = createProjectWithObjects();
    const renamed = updateObject(project, 'object-alice', { name: 'aliceUpdated' });
    const updatedSlot = updateSlotValueByAttribute(
      renamed,
      'object-alice',
      { id: 'attr-user-books', type: 'Integer' },
      { value: 6, valueType: 'Integer', isUnset: false },
    );

    expect(updatedSlot.objectModel.objects[0]).toMatchObject({
      name: 'aliceUpdated',
      slots: [
        {
          attributeId: 'attr-user-books',
          value: 6,
          valueType: 'Integer',
          isUnset: false,
        },
      ],
    });
  });

  it('updates an object link end value', () => {
    const project = addObjectLink(createProjectWithObjects(), {
      associationId: 'assoc-borrows',
      sourceObjectId: 'object-alice',
      targetObjectId: 'object-book',
    }).project;
    const linkId = project.objectModel.links[0].id;
    const updated = updateObjectLinkEnd(
      project,
      linkId,
      'end-borrows-book',
      'object-book',
    );

    expect(updated.objectModel.links[0].endValues).toContainEqual({
      associationEndId: 'end-borrows-book',
      objectId: 'object-book',
    });
  });

  it('appends a backend-created object link without removing objects', () => {
    const project = createProjectWithObjects();
    const updated = appendObjectLink(project, {
      id: 'link-from-backend',
      associationId: 'assoc-borrows',
      endValues: [
        { associationEndId: 'end-borrows-user', objectId: 'object-alice' },
        { associationEndId: 'end-borrows-book', objectId: 'object-book' },
      ],
    });

    expect(updated.objectModel.objects).toEqual(project.objectModel.objects);
    expect(updated.objectModel.links).toContainEqual({
      id: 'link-from-backend',
      associationId: 'assoc-borrows',
      endValues: [
        { associationEndId: 'end-borrows-user', objectId: 'object-alice' },
        { associationEndId: 'end-borrows-book', objectId: 'object-book' },
      ],
    });
  });
});

function createProjectWithObjects(): ProjectDto {
  const project = createProject();

  return {
    ...project,
    objectModel: {
      ...project.objectModel,
      objects: [
        {
          id: 'object-alice',
          name: 'alice',
          classId: 'class-user',
          slots: [],
        },
        {
          id: 'object-book',
          name: 'mobyDick',
          classId: 'class-book',
          slots: [],
        },
      ],
    },
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
          operations: [],
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
      invariants: [],
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
