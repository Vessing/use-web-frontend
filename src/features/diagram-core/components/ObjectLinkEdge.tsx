import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

import type { ObjectLinkEdgeData } from '../types';
import { edgePoint } from './edgeLabelGeometry';

export function ObjectLinkEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
  } = props;
  const data = props.data as ObjectLinkEdgeData;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const sourceLabel = edgePoint(sourceX, sourceY, targetX, targetY, 0.18);
  const targetLabel = edgePoint(sourceX, sourceY, targetX, targetY, 0.82);
  const hasError = data.validationState === 'error';
  const hasWarning = data.validationState === 'warning';
  const edgeStateClass = hasError ? 'error' : hasWarning ? 'warning' : '';
  const className = ['diagram-edge', selected ? 'selected' : '', edgeStateClass]
    .filter(Boolean)
    .join(' ');
  const labelStateClass = hasError
    ? 'edge-label-error'
    : hasWarning
      ? 'edge-label-warning'
      : '';

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} className={className} />
      <EdgeLabelRenderer>
        <div
          className={['edge-label', 'edge-label-center', labelStateClass]
            .filter(Boolean)
            .join(' ')}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data.associationName}
        </div>
        <div
          className="edge-label edge-label-end"
          style={{
            transform: `translate(-50%, -50%) translate(${sourceLabel.x}px, ${sourceLabel.y}px)`,
          }}
        >
          {data.sourceEnd.roleName} {data.sourceEnd.multiplicity}
        </div>
        <div
          className="edge-label edge-label-end"
          style={{
            transform: `translate(-50%, -50%) translate(${targetLabel.x}px, ${targetLabel.y}px)`,
          }}
        >
          {data.targetEnd.roleName} {data.targetEnd.multiplicity}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
