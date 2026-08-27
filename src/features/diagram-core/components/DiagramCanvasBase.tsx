import {
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useEffect, useState } from 'react';

import type { WorkspaceView } from '../../../app/navigation';
import type { SelectionState } from '../../../state';
import { appStoreActions } from '../../../state';
import type { DiagramEdge, DiagramElementKind, DiagramNode } from '../types';
import { ObjectLinkEdge } from './ObjectLinkEdge';
import { ObjectNode } from './ObjectNode';
import { UmlAssociationEdge } from './UmlAssociationEdge';
import { UmlClassNode } from './UmlClassNode';

const nodeTypes = {
  umlClass: UmlClassNode,
  objectNode: ObjectNode,
} satisfies NodeTypes;

const edgeTypes = {
  umlAssociation: UmlAssociationEdge,
  objectLink: ObjectLinkEdge,
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
        onNodesChange={(changes) => {
          setCanvasNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
          persistNodePositionChanges(activeView, changes);
        }}
        onSelectionChange={(selection) => updateSelection(activeView, selection)}
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

function updateSelection(
  activeView: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>,
  selection: OnSelectionChangeParams,
) {
  const selectedNode = selection.nodes[0] as DiagramNode | undefined;
  const selectedEdge = selection.edges[0] as DiagramEdge | undefined;

  if (selectedNode?.data.ref) {
    appStoreActions.select(selectionFor(activeView, selectedNode.data.ref));
    return;
  }

  if (selectedEdge?.data?.ref) {
    appStoreActions.select(selectionFor(activeView, selectedEdge.data.ref));
    return;
  }

  appStoreActions.clearSelection();
}

function selectionFor(
  activeView: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>,
  ref: { elementType: DiagramElementKind; elementId: string },
): SelectionState {
  if (
    activeView === 'class-diagram' &&
    (ref.elementType === 'class' || ref.elementType === 'association')
  ) {
    return {
      view: 'class-diagram',
      type: ref.elementType,
      id: ref.elementId,
    };
  }

  if (
    activeView === 'object-diagram' &&
    (ref.elementType === 'object' || ref.elementType === 'objectLink')
  ) {
    return {
      view: 'object-diagram',
      type: ref.elementType,
      id: ref.elementId,
    };
  }

  return null;
}
