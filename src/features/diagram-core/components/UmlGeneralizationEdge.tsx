import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

import type { DiagramEdge } from '../types';

export function UmlGeneralizationEdge(props: EdgeProps<DiagramEdge>) {
  const [path] = getStraightPath(props);
  const markerId = `generalization-${props.id.replace(/:/g, '-')}`;

  return (
    <>
      <defs>
        <marker id={markerId} markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
          <path d="M 1 1 L 13 7 L 1 13 z" fill="white" stroke="#475569" />
        </marker>
      </defs>
      <BaseEdge id={props.id} path={path} markerEnd={`url(#${markerId})`} style={{ stroke: '#475569', strokeWidth: 1.5 }} />
    </>
  );
}
