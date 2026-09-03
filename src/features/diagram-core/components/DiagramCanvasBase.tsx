import {
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react';
import { useEffect, useState } from 'react';

import type { WorkspaceView } from '../../../app/navigation';
import { appStoreActions } from '../../../state';
import type { DiagramEdge, DiagramNode } from '../types';
import { selectionFor } from './canvasSelection';
import { ObjectLinkEdge } from './ObjectLinkEdge';
import { ObjectNode } from './ObjectNode';
import { NaryHubNode } from './NaryHubNode';
import { NarySegmentEdge } from './NarySegmentEdge';
import { SemanticConnectorEdge } from './SemanticConnectorEdge';
import { UmlAssociationEdge } from './UmlAssociationEdge';
import { UmlClassNode } from './UmlClassNode';
import { UmlGeneralizationEdge } from './UmlGeneralizationEdge';
import { ModelTypeNode } from './ModelTypeNode';

const nodeTypes = {
  umlClass: UmlClassNode,
  objectNode: ObjectNode,
  naryHub: NaryHubNode,
  modelType: ModelTypeNode,
} satisfies NodeTypes;

const edgeTypes = {
  umlAssociation: UmlAssociationEdge,
  umlGeneralization: UmlGeneralizationEdge,
  objectLink: ObjectLinkEdge,
  narySegment: NarySegmentEdge,
  semanticConnector: SemanticConnectorEdge,
} satisfies EdgeTypes;

interface DiagramCanvasBaseProps {
  activeView: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  title: string;
}

export function DiagramCanvasBase({
  activeView,
  nodes,
  edges,
  title,
}: DiagramCanvasBaseProps) {
  const [canvasNodes, setCanvasNodes] = useState(nodes);

  useEffect(() => {
    setCanvasNodes(nodes);
  }, [nodes]);

  return (
    <section className="diagram-canvas-shell" aria-label={title}>
      <ReactFlow
        nodes={canvasNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{ zIndex: 10 }}
        onNodesChange={(changes) => {
          setCanvasNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
          persistNodePositionChanges(activeView, changes);
        }}
        onNodeClick={(_, node) => {
          if (node.data.ref) appStoreActions.select(selectionFor(activeView, node.data.ref));
        }}
        onEdgeClick={(_, edge) => {
          if (edge.data?.ref) appStoreActions.select(selectionFor(activeView, edge.data.ref));
        }}
        onPaneClick={() => appStoreActions.clearSelection()}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}

function persistNodePositionChanges(
  activeView: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>,
  changes: NodeChange<DiagramNode>[],
) {
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) {
      continue;
    }

    appStoreActions.updateNodeLayout(activeView, change.id, {
      x: change.position.x,
      y: change.position.y,
    });
  }
}
