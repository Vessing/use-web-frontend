import type { ProjectDto, ProjectReadModelDto } from '../../../api';
import { ClassDiagramModals } from '../../../features/class-diagram/modals/ClassDiagramModals';
import { ObjectDiagramModals } from '../../../features/object-diagram/modals/ObjectDiagramModals';
import { useAppStore } from '../../../state';

interface ModalLayerProps {
  project: ProjectDto | null;
  readModel: ProjectReadModelDto | null;
  onProjectChange: (project: ProjectDto) => void;
  onRefreshProject: () => Promise<boolean>;
}

export function ModalLayer({ project, readModel, onProjectChange, onRefreshProject }: ModalLayerProps) {
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
        expectedRevision={readModel?.readVersion ?? ''}
        onProjectChange={onProjectChange}
        onRefreshProject={onRefreshProject}
      />
      <ObjectDiagramModals
        key={`${modal.type}-object`}
        modal={modal}
        project={project}
        expectedRevision={readModel?.readVersion ?? ''}
        onRefreshProject={onRefreshProject}
      />
    </div>
  );
}
