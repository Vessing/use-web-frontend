import { describe, expect, it } from 'vitest';

import { getSelfAssociationGeometry } from './UmlAssociationEdge';
import { getAggregationDiamondPath } from './UmlAggregationDiamond';

describe('getSelfAssociationGeometry', () => {
  it('routes a self-association outside the class and separates its labels', () => {
    const geometry = getSelfAssociationGeometry(320, 180, 140, 180);

    expect(geometry.edgePath).toContain('C 396 180, 396 268, 360 268');
    expect(geometry.edgePath).toContain('L 100 268');
    expect(geometry.edgePath).toContain('C 64 268, 64 180, 140 180');
    expect(geometry.labelY).toBe(284);
    expect(geometry.sourceLabel).toEqual({ x: 366, y: 200 });
    expect(geometry.targetLabel).toEqual({ x: 94, y: 200 });
    expect(geometry.sourceDiamondToward).toEqual({ x: 321, y: 180 });
    expect(geometry.targetDiamondToward).toEqual({ x: 139, y: 180 });
  });
});

describe('getAggregationDiamondPath', () => {
  it('positions the UML diamond on the association end toward the connecting line', () => {
    expect(getAggregationDiamondPath(100, 50, 200, 50)).toBe(
      'M 107 43 L 114 50 L 107 57 L 100 50 Z',
    );
  });
});
