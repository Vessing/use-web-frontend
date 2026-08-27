import type { DiagramEdge, DiagramNode } from './types';

export function createStep7ClassDiagramElements(): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  return {
    nodes: [
      {
        id: 'class-user',
        type: 'umlClass',
        position: { x: 120, y: 120 },
        data: {
          ref: { elementType: 'class', elementId: 'class-user' },
          name: 'User',
          attributes: ['name : String', 'books : Integer'],
          operations: ['borrow(book : Book) : Boolean'],
          invariants: [{ id: 'inv-max-books', label: 'inv: maxBooks' }],
        },
      },
      {
        id: 'class-book',
        type: 'umlClass',
        position: { x: 520, y: 140 },
        data: {
          ref: { elementType: 'class', elementId: 'class-book' },
          name: 'Book',
          attributes: ['title : String', 'available : Boolean'],
          operations: [],
          invariants: [],
        },
      },
    ],
    edges: [
      {
        id: 'assoc-borrows',
        type: 'umlAssociation',
        source: 'class-user',
        target: 'class-book',
        data: {
          ref: { elementType: 'association', elementId: 'assoc-borrows' },
          associationName: 'Borrows',
          sourceEnd: { roleName: 'borrower', multiplicity: '1' },
          targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
        },
      },
    ],
  };
}

export function createStep7ObjectDiagramElements(): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  return {
    nodes: [
      {
        id: 'object-alice',
        type: 'objectNode',
        position: { x: 140, y: 120 },
        data: {
          ref: { elementType: 'object', elementId: 'object-alice' },
          name: 'alice',
          className: 'User',
          slots: ['name = Alice', 'books = 6'],
          validationState: 'error',
        },
      },
      {
        id: 'object-book',
        type: 'objectNode',
        position: { x: 540, y: 150 },
        data: {
          ref: { elementType: 'object', elementId: 'object-book' },
          name: 'mobyDick',
          className: 'Book',
          slots: ['title = Moby Dick', 'available = false'],
        },
      },
    ],
    edges: [
      {
        id: 'link-borrows-1',
        type: 'objectLink',
        source: 'object-alice',
        target: 'object-book',
        data: {
          ref: { elementType: 'objectLink', elementId: 'link-borrows-1' },
          associationName: 'Borrows',
          sourceEnd: { roleName: 'borrower', multiplicity: '1' },
          targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
        },
      },
    ],
  };
}
