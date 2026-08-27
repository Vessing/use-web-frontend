import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ReactNode } from 'react';

import type { UmlAssociationEdgeData } from '../types';
import { edgePoint } from './edgeLabelGeometry';

export function UmlAssociationEdge(props: EdgeProps) {
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
  const data = props.data as UmlAssociationEdgeData;
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
        <AssociationLabel
          x={labelX}
          y={labelY}
          className={['edge-label', 'edge-label-center', labelStateClass]
            .filter(Boolean)
            .join(' ')}
        >
          {data.associationName}
        </AssociationLabel>
        <AssociationLabel
          x={sourceLabel.x}
          y={sourceLabel.y}
          className="edge-label edge-label-end"
        >
          {data.sourceEnd.roleName} {data.sourceEnd.multiplicity}
        </AssociationLabel>
        <AssociationLabel
          x={targetLabel.x}
          y={targetLabel.y}
          className="edge-label edge-label-end"
        >
          {data.targetEnd.roleName} {data.targetEnd.multiplicity}
        </AssociationLabel>
      </EdgeLabelRenderer>
    </>
  );
}

interface AssociationLabelProps {
  x: number;
  y: number;
  className: string;
  children: ReactNode;
}

function AssociationLabel({ x, y, className, children }: AssociationLabelProps) {
  return (
    <div
      className={className}
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
      }}
    >
      {children}
    </div>
  );
}
