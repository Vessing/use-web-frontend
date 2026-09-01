import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { NaryHubNodeData } from '../types';

export function NaryHubNode({ data, selected }: NodeProps) {
  const hub = data as NaryHubNodeData;
  return (
    <div className={`nary-hub-node${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <strong>{hub.name}</strong>
      <span>{hub.participantCount} ends</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
