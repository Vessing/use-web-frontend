import type { ProjectDto } from '../../../api';
import { ClassDiagramModals } from '../../../features/class-diagram/modals/ClassDiagramModals';
import { ObjectDiagramModals } from '../../../features/object-diagram/modals/ObjectDiagramModals';
import { useAppStore } from '../../../state';

interface ModalLayerProps {
  project: ProjectDto | null;
  onProjectChange: (project: ProjectDto) => void;
}

export function ModalLayer({ project, onProjectChange }: ModalLayerProps) {
  const modal = useAppStore((state) => state.modal);

  if (!modal || !project) {
    return <div id="modal-layer" aria-live="polite" />;
  }

  return (
    <div id="modal-layer" aria-live="polite">
      <ClassDiagramModals
        key={modal.type}
        modal={modal}
        project={project}
        onProjectChange={onProjectChange}
      />
      <ObjectDiagramModals
        key={`${modal.type}-object`}
        modal={modal}
        project={project}
        onProjectChange={onProjectChange}
      />
    </div>
  );
}
