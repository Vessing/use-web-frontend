import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ReactNode } from 'react';

import type { UmlAssociationEdgeData } from '../types';
import { edgePoint } from './edgeLabelGeometry';
import { UmlAggregationDiamond } from './UmlAggregationDiamond';

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
  const [defaultEdgePath, defaultLabelX, defaultLabelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const selfAssociation = props.source === props.target;
  const geometry = selfAssociation
    ? getSelfAssociationGeometry(sourceX, sourceY, targetX, targetY)
    : {
        edgePath: defaultEdgePath,
        labelX: defaultLabelX,
        labelY: defaultLabelY,
        sourceLabel: edgePoint(sourceX, sourceY, targetX, targetY, 0.18),
        targetLabel: edgePoint(sourceX, sourceY, targetX, targetY, 0.82),
        sourceDiamondToward: { x: targetX, y: targetY },
        targetDiamondToward: { x: sourceX, y: sourceY },
      };
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
      <BaseEdge id={id} path={geometry.edgePath} markerEnd={markerEnd} className={className} />
      <UmlAggregationDiamond
        x={sourceX}
        y={sourceY}
        towardX={geometry.sourceDiamondToward.x}
        towardY={geometry.sourceDiamondToward.y}
        kind={data.sourceEnd.aggregationKind}
      />
      <UmlAggregationDiamond
        x={targetX}
        y={targetY}
        towardX={geometry.targetDiamondToward.x}
        towardY={geometry.targetDiamondToward.y}
        kind={data.targetEnd.aggregationKind}
      />
      <EdgeLabelRenderer>
        <AssociationLabel
          x={geometry.labelX}
          y={geometry.labelY}
          className={['edge-label', 'edge-label-center', labelStateClass]
            .filter(Boolean)
            .join(' ')}
        >
          {data.associationName}
        </AssociationLabel>
        <AssociationLabel
          x={geometry.sourceLabel.x}
          y={geometry.sourceLabel.y}
          className="edge-label edge-label-end"
        >
          {data.sourceEnd.roleName} {data.sourceEnd.multiplicity}
        </AssociationLabel>
        <AssociationLabel
          x={geometry.targetLabel.x}
          y={geometry.targetLabel.y}
          className="edge-label edge-label-end"
        >
          {data.targetEnd.roleName} {data.targetEnd.multiplicity}
        </AssociationLabel>
      </EdgeLabelRenderer>
    </>
  );
}

export function getSelfAssociationGeometry(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const horizontalOffset = 76;
  const verticalOffset = 88;
  const loopY = Math.max(sourceY, targetY) + verticalOffset;

  return {
    edgePath: [
      `M ${sourceX} ${sourceY}`,
      `C ${sourceX + horizontalOffset} ${sourceY}, ${sourceX + horizontalOffset} ${loopY}, ${sourceX + 40} ${loopY}`,
      `L ${targetX - 40} ${loopY}`,
      `C ${targetX - horizontalOffset} ${loopY}, ${targetX - horizontalOffset} ${targetY}, ${targetX} ${targetY}`,
    ].join(' '),
    labelX: (sourceX + targetX) / 2,
    labelY: loopY + 16,
    sourceLabel: { x: sourceX + 46, y: sourceY + 20 },
    targetLabel: { x: targetX - 46, y: targetY + 20 },
    sourceDiamondToward: { x: sourceX + 1, y: sourceY },
    targetDiamondToward: { x: targetX - 1, y: targetY },
  };
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
