import type { ProjectDto } from '../../../api/dtos';
import type { SelectionState } from '../../../state';
import { ObjectAssociationPropertiesPanel } from './ObjectAssociationPropertiesPanel';
import { ObjectPropertiesPanel } from './ObjectPropertiesPanel';

interface ObjectDiagramPropertiesPanelProps {
  project: ProjectDto | null;
  selection: SelectionState;
  onProjectChange: (project: ProjectDto) => void;
}

export function ObjectDiagramPropertiesPanel({
  project,
  selection,
  onProjectChange,
}: ObjectDiagramPropertiesPanelProps) {
  if (!project) {
    return <p>Project snapshot is not loaded.</p>;
  }

  if (!selection || selection.view !== 'object-diagram') {
    return <p>No object diagram element selected.</p>;
  }

  if (selection.type === 'object') {
    const object = project.objectModel.objects.find(
      (candidate) => candidate.id === selection.id,
    );

    if (!object) {
      return <p>Selected object no longer exists.</p>;
    }

    return (
      <ObjectPropertiesPanel
        project={project}
        object={object}
        onProjectChange={onProjectChange}
      />
    );
  }

  if (selection.type === 'objectLink') {
    const link = project.objectModel.links.find((candidate) => candidate.id === selection.id);

    if (!link) {
      return <p>Selected object link no longer exists.</p>;
    }

    return (
      <ObjectAssociationPropertiesPanel
        project={project}
        link={link}
        onProjectChange={onProjectChange}
      />
    );
  }

  return <p>No object diagram element selected.</p>;
}
