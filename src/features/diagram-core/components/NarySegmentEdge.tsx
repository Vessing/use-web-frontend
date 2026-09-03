import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';

import type { NarySegmentEdgeData } from '../types';
import { UmlAggregationDiamond } from './UmlAggregationDiamond';

export function NarySegmentEdge(props: EdgeProps) {
  const data = props.data as NarySegmentEdgeData;
  const [path, labelX, labelY] = getStraightPath(props);
  const qualifier = data.qualifierNames.length ? ` [${data.qualifierNames.join(', ')}]` : '';
  return (
    <>
      <BaseEdge id={props.id} path={path} className="diagram-edge" />
      <UmlAggregationDiamond
        x={props.targetX}
        y={props.targetY}
        towardX={props.sourceX}
        towardY={props.sourceY}
        kind={data.endLabel.aggregationKind}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-label edge-label-end"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data.endLabel.roleName} {data.endLabel.multiplicity}{qualifier}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
