import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { DiagramNode, ObjectNodeData } from '../types';

export function ObjectNode({ data, selected }: NodeProps<DiagramNode>) {
  const nodeData = data as ObjectNodeData;
  const hasError = nodeData.validationState === 'error';
  const hasWarning = nodeData.validationState === 'warning';
  const issueCount = nodeData.validationIssueCount ?? 0;
  const className = [
    'uml-node',
    'object-node',
    selected ? 'uml-node-selected' : '',
    hasError ? 'uml-node-error' : '',
    hasWarning ? 'uml-node-warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <Handle type="target" position={Position.Left} />
      {hasError || hasWarning ? (
        <span
          className={hasWarning ? 'validation-badge warning' : 'validation-badge'}
          aria-label={`${issueCount} validation issue${issueCount === 1 ? '' : 's'} for ${nodeData.name}`}
        >
          {issueCount}
        </span>
      ) : null}
      <div className="uml-node-title">
        {nodeData.name} : {nodeData.className}
      </div>
      <div className="uml-node-section">
        {nodeData.slots.map((slot) => (
          <span key={slot}>{slot}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
