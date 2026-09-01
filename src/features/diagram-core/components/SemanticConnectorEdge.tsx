import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';

import type { SemanticConnectorEdgeData } from '../types';

export function SemanticConnectorEdge(props: EdgeProps) {
  const [path, labelX, labelY] = getStraightPath(props);
  const data = props.data as SemanticConnectorEdgeData;

  return <>
    <BaseEdge id={props.id} path={path} className="association-class-connector" />
    <EdgeLabelRenderer>
      <span
        className="association-class-connector-label"
        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
      >
        {data.label}
      </span>
    </EdgeLabelRenderer>
  </>;
}
