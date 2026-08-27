import { Handle, Position, type NodeProps } from '@xyflow/react';

import { appStoreActions } from '../../../state';
import type { DiagramNode, UmlClassNodeData } from '../types';

export function UmlClassNode({ data, selected }: NodeProps<DiagramNode>) {
  const nodeData = data as UmlClassNodeData;
  const hasError = nodeData.validationState === 'error';
  const hasWarning = nodeData.validationState === 'warning';
  const issueCount = nodeData.validationIssueCount ?? 0;
  const className = [
    'uml-node',
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
      <div className="uml-node-title">{nodeData.name}</div>
      <div className="uml-node-section">
        {nodeData.attributes.length === 0 ? (
          <span className="uml-node-muted">No attributes</span>
        ) : (
          nodeData.attributes.map((attribute) => <span key={attribute}>{attribute}</span>)
        )}
      </div>
      <div className="uml-node-section">
        {nodeData.operations.length === 0 ? (
          <span className="uml-node-muted">No operations</span>
        ) : (
          nodeData.operations.map((operation) => <span key={operation}>{operation}</span>)
        )}
      </div>
      {nodeData.invariants.length > 0 ? (
        <div className="uml-node-invariants">
          {nodeData.invariants.map((invariant) => (
            <button
              key={invariant.id}
              type="button"
              className={[
                'invariant-badge',
                invariant.selected ? 'invariant-badge-selected' : '',
                invariant.validationState === 'error' ? 'invariant-badge-error' : '',
                invariant.validationState === 'warning'
                  ? 'invariant-badge-warning'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={
                invariant.validationIssueCount
                  ? `${invariant.label}, ${invariant.validationIssueCount} validation issue${
                      invariant.validationIssueCount === 1 ? '' : 's'
                    }`
                  : invariant.label
              }
              onClick={(event) => {
                event.stopPropagation();
                appStoreActions.select({
                  view: 'class-diagram',
                  type: 'invariant',
                  id: invariant.id,
                });
              }}
            >
              {invariant.label}
            </button>
          ))}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
