import type { ProjectDto } from '../../../api';
import type { WorkspaceView } from '../../../app/navigation';
import { appStoreActions } from '../../../state';

interface WorkspaceCanvasToolbarProps {
  activeView: WorkspaceView;
  project: ProjectDto | null;
}

export function WorkspaceCanvasToolbar({ activeView, project }: WorkspaceCanvasToolbarProps) {
  if (activeView === 'ocl') {
    return null;
  }

  const disabled = !project;

  if (activeView === 'object-diagram') {
    return (
      <nav className="canvas-create-toolbar" aria-label="Create object diagram elements">
        <button
          type="button"
          className="create-tool create-tool-object"
          disabled={disabled || project.umlModel.classes.length === 0}
          onClick={() => appStoreActions.openModal({ type: 'addObject' })}
        >
          Create Object
        </button>
        <button
          type="button"
          className="create-tool create-tool-link"
          disabled={disabled || project.objectModel.objects.length < 2}
          onClick={() => appStoreActions.openModal({ type: 'addObjectAssociation' })}
        >
          Create Object Link
        </button>
      </nav>
    );
  }

  return (
    <nav className="canvas-create-toolbar" aria-label="Create class diagram elements">
      <button
        type="button"
        className="create-tool create-tool-class"
        disabled={disabled}
        onClick={() => appStoreActions.openModal({ type: 'addClass' })}
      >
        Class
      </button>
      <button
        type="button"
        className="create-tool create-tool-association"
        disabled={disabled || project.umlModel.classes.length < 2}
        onClick={() => appStoreActions.openModal({ type: 'addClassAssociation' })}
      >
        Association
      </button>
      <button
        type="button"
        className="create-tool create-tool-invariant"
        disabled={disabled || project.umlModel.classes.length === 0}
        onClick={() => appStoreActions.openModal({ type: 'addInvariant' })}
      >
        Invariant
      </button>
      <button
        type="button"
        className="create-tool create-tool-enumeration"
        disabled={disabled}
        onClick={() => appStoreActions.openModal({ type: 'addEnumeration' })}
      >
        Enumeration
      </button>
      <button
        type="button"
        className="create-tool create-tool-datatype"
        disabled={disabled}
        onClick={() => appStoreActions.openModal({ type: 'addDataType' })}
      >
        DataType
      </button>
    </nav>
  );
}
