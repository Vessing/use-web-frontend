import type { ProjectDto } from '../../../api/dtos';
import type { SelectionState } from '../../../state';
import { AssociationPropertiesPanel } from './AssociationPropertiesPanel';
import { ClassPropertiesPanel } from './ClassPropertiesPanel';
import { InvariantPropertiesPanel } from './InvariantPropertiesPanel';

interface ClassDiagramPropertiesPanelProps {
  project: ProjectDto | null;
  selection: SelectionState;
  onProjectChange: (project: ProjectDto) => void;
}

export function ClassDiagramPropertiesPanel({
  project,
  selection,
  onProjectChange,
}: ClassDiagramPropertiesPanelProps) {
  if (!project) {
    return <p>Project data is not loaded.</p>;
  }

  if (!selection || selection.view !== 'class-diagram') {
    return <p>Select a class, association or invariant in the class diagram.</p>;
  }

  if (selection.type === 'class') {
    const umlClass = project.umlModel.classes.find((candidate) => candidate.id === selection.id);
    return umlClass ? (
      <ClassPropertiesPanel
        project={project}
        umlClass={umlClass}
        onProjectChange={onProjectChange}
      />
    ) : (
      <p>The selected class no longer exists.</p>
    );
  }

  if (selection.type === 'association') {
    const association = project.umlModel.associations.find(
      (candidate) => candidate.id === selection.id,
    );
    return association ? (
      <AssociationPropertiesPanel
        project={project}
        association={association}
        onProjectChange={onProjectChange}
      />
    ) : (
      <p>The selected association no longer exists.</p>
    );
  }

  if (selection.type === 'invariant') {
    const invariant = project.umlModel.invariants.find(
      (candidate) => candidate.id === selection.id,
    );
    return invariant ? (
      <InvariantPropertiesPanel
        project={project}
        invariant={invariant}
        onProjectChange={onProjectChange}
      />
    ) : (
      <p>The selected invariant no longer exists.</p>
    );
  }

  return <p>Select a class diagram element.</p>;
}
