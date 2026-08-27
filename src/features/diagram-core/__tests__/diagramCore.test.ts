import { describe, expect, it } from 'vitest';

import { formatMultiplicity } from '../format';
import {
  createStep7ClassDiagramElements,
  createStep7ObjectDiagramElements,
} from '../step7SampleDiagram';

describe('diagram-core', () => {
  it('formats backend multiplicities for association end labels', () => {
    expect(
      formatMultiplicity({
        lower: 0,
        upper: null,
        unbounded: true,
        raw: '0..*',
      }),
    ).toBe('0..*');

    expect(
      formatMultiplicity({
        lower: 1,
        upper: 1,
        unbounded: false,
        raw: '',
      }),
    ).toBe('1');
  });

  it('prepares a class diagram with a custom association edge label model', () => {
    const diagram = createStep7ClassDiagramElements();

    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]).toMatchObject({
      type: 'umlAssociation',
      data: {
        associationName: 'Borrows',
        sourceEnd: { roleName: 'borrower', multiplicity: '1' },
        targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
      },
    });
  });

  it('prepares an object diagram with object link end data', () => {
    const diagram = createStep7ObjectDiagramElements();

    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.edges[0]).toMatchObject({
      type: 'objectLink',
      data: {
        associationName: 'Borrows',
        sourceEnd: { roleName: 'borrower', multiplicity: '1' },
        targetEnd: { roleName: 'borrowedBooks', multiplicity: '0..5' },
      },
    });
  });
});
