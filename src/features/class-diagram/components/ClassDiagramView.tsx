import { useMemo } from 'react';

import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions, useAppStore } from '../../../state';
import { DiagramCanvasBase } from '../../diagram-core';
import { mapProjectToClassDiagram } from '../classDiagramMapper';

interface ClassDiagramViewProps {
  project: ProjectDto | null;
  isLoading: boolean;
  error: string | null;
}

export function ClassDiagramView({ project, isLoading, error }: ClassDiagramViewProps) {
  const markersByElementId = useAppStore(
    (state) => state.validation.markersByElementId,
  );
  const selection = useAppStore((state) => state.selection);
  const layoutDraft = useAppStore((state) => state.layoutDraft.classDiagram);
  const diagram = useMemo(
    () =>
      project && project.umlModel.classes.length > 0
        ? mapProjectToClassDiagram(project, markersByElementId, selection, layoutDraft)
        : { nodes: [], edges: [] },
    [project, markersByElementId, selection, layoutDraft],
  );

  if (isLoading) {
    return (
      <section className="canvas-placeholder" aria-label="Class Diagram Loading">
        <h2>Class Diagram</h2>
        <p>Loading project model...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="canvas-placeholder" aria-label="Class Diagram Error">
        <h2>Class Diagram</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!project || project.umlModel.classes.length === 0) {
    return (
      <section className="canvas-placeholder" aria-label="Empty Class Diagram">
        <h2>Class Diagram</h2>
        <p>No classes yet. Use Add Class to start the UML model.</p>
        {project ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => appStoreActions.openModal({ type: 'addClass' })}
          >
            Add Class
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <DiagramCanvasBase
      activeView="class-diagram"
      nodes={diagram.nodes}
      edges={diagram.edges}
      title="Class Diagram Canvas"
    />
  );
}
