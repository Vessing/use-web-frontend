import { useMemo } from 'react';

import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions, useAppStore } from '../../../state';
import { DiagramCanvasBase } from '../../diagram-core';
import { mapProjectToObjectDiagram } from '../objectDiagramMapper';

interface ObjectDiagramViewProps {
  project: ProjectDto | null;
  isLoading: boolean;
  error: string | null;
}

export function ObjectDiagramView({ project, isLoading, error }: ObjectDiagramViewProps) {
  const markersByElementId = useAppStore(
    (state) => state.validation.markersByElementId,
  );
  const selection = useAppStore((state) => state.selection);
  const layoutDraft = useAppStore((state) => state.layoutDraft.objectDiagram);
  const diagram = useMemo(
    () =>
      project && project.objectModel.objects.length > 0
        ? mapProjectToObjectDiagram(project, markersByElementId, selection, layoutDraft)
        : { nodes: [], edges: [] },
    [project, markersByElementId, selection, layoutDraft],
  );

  if (isLoading) {
    return (
      <section className="canvas-placeholder" aria-label="Object Diagram Loading">
        <h2>Object Diagram</h2>
        <p>Loading snapshot...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="canvas-placeholder" aria-label="Object Diagram Error">
        <h2>Object Diagram</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!project || project.objectModel.objects.length === 0) {
    return (
      <section className="canvas-placeholder" aria-label="Empty Object Diagram">
        <h2>Object Diagram</h2>
        <p>No objects yet. Use Add Object to create a snapshot instance.</p>
        {project ? (
          <button
            type="button"
            className="primary-button"
            disabled={project.umlModel.classes.length === 0}
            onClick={() => appStoreActions.openModal({ type: 'addObject' })}
          >
            Add Object
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <DiagramCanvasBase
      activeView="object-diagram"
      nodes={diagram.nodes}
      edges={diagram.edges}
      title="Object Diagram Canvas"
    />
  );
}
