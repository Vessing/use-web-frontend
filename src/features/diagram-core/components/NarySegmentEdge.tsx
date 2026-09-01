import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';

import type { NarySegmentEdgeData } from '../types';

export function NarySegmentEdge(props: EdgeProps) {
  const data = props.data as NarySegmentEdgeData;
  const [path, labelX, labelY] = getStraightPath(props);
  const qualifier = data.qualifierNames.length ? ` [${data.qualifierNames.join(', ')}]` : '';
  const aggregation = data.endLabel.aggregationKind === 'COMPOSITE' ? '\u25c6 ' : data.endLabel.aggregationKind === 'SHARED' ? '\u25c7 ' : '';
  return (
    <>
      <BaseEdge id={props.id} path={path} className="diagram-edge" />
      <EdgeLabelRenderer>
        <div
          className="edge-label edge-label-end"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {aggregation}{data.endLabel.roleName} {data.endLabel.multiplicity}{qualifier}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
