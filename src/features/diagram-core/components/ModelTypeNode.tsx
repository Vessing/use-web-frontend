import { type NodeProps } from '@xyflow/react';
import type { DiagramNode, ModelTypeNodeData } from '../types';

export function ModelTypeNode({ data, selected }: NodeProps<DiagramNode>) { const item = data as ModelTypeNodeData; return <div className={`uml-node model-type-node model-type-node-${item.kind.toLocaleLowerCase()} ${selected ? 'uml-node-selected' : ''}`}><div className="uml-node-stereotype">&laquo;{item.kind}&raquo;</div><div className="uml-node-title" title={item.qualifiedName}>{item.name}</div><div className="uml-node-section">{item.entries.length ? item.entries.map((entry) => <span key={entry}>{entry}</span>) : <span className="uml-node-muted">Empty</span>}</div></div>; }
