import type { ProjectDto } from '../../api/dtos';
import { appStoreActions } from '../../state';

interface DeleteAndSyncOptions {
  project: ProjectDto;
  deleteRequest: () => Promise<ProjectDto>;
  onProjectChange: (project: ProjectDto) => void;
  successMessage: string;
}

export async function deleteProjectElementAndSync({
  project,
  deleteRequest,
  onProjectChange,
  successMessage,
}: DeleteAndSyncOptions) {
  const updatedProject = await deleteRequest();
  const removedElementIds = collectRemovedElementIds(project, updatedProject);

  onProjectChange(updatedProject);
  appStoreActions.removeElementReferences(removedElementIds);
  appStoreActions.markValidationStale();
  appStoreActions.addConsoleLog({
    level: 'info',
    source: 'ui',
    message: successMessage,
  });

  return updatedProject;
}

export function collectRemovedElementIds(before: ProjectDto, after: ProjectDto) {
  const beforeIds = collectProjectElementIds(before);
  const afterIds = collectProjectElementIds(after);

  return [...beforeIds].filter((id) => !afterIds.has(id));
}

function collectProjectElementIds(project: ProjectDto) {
  const ids = new Set<string>();

  for (const umlClass of project.umlModel.classes) {
    ids.add(umlClass.id);
    umlClass.attributes.forEach((attribute) => ids.add(attribute.id));
    umlClass.operations.forEach((operation) => {
      ids.add(operation.id);
      operation.parameters.forEach((parameter) => ids.add(parameter.id));
    });
  }

  for (const association of project.umlModel.associations) {
    ids.add(association.id);
    association.ends.forEach((end) => ids.add(end.id));
  }

  project.umlModel.invariants.forEach((invariant) => ids.add(invariant.id));

  for (const object of project.objectModel.objects) {
    ids.add(object.id);
    object.slots.forEach((slot) => ids.add(slot.id));
  }

  project.objectModel.links.forEach((link) => ids.add(link.id));
  project.layout.classDiagram.nodes.forEach((node) => ids.add(node.elementId));
  project.layout.classDiagram.edges?.forEach((edge) => ids.add(edge.elementId));
  project.layout.objectDiagram.nodes.forEach((node) => ids.add(node.elementId));
  project.layout.objectDiagram.edges?.forEach((edge) => ids.add(edge.elementId));

  return ids;
}
