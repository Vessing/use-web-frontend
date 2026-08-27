import type { WorkspaceView } from '../../../app/navigation';
import { appStoreActions } from '../../../state';

const explorerGroupsByView: Record<WorkspaceView, string[]> = {
  'class-diagram': ['Classes', 'Associations', 'Invariants'],
  'object-diagram': ['Objects', 'Associations'],
  ocl: ['Invariants', 'Context Classes'],
};

interface ExplorerSidebarProps {
  activeView: WorkspaceView;
  canEditProject: boolean;
}

export function ExplorerSidebar({ activeView, canEditProject }: ExplorerSidebarProps) {
  return (
    <aside className="explorer-sidebar" aria-label="Explorer Sidebar">
      <h2>Explorer</h2>
      <ul>
        {explorerGroupsByView[activeView].map((group) => (
          <li key={group}>
            <span>{group}</span>
            <button
              type="button"
              aria-label={`Add ${group}`}
              disabled={!canEditProject || !modalForGroup(activeView, group)}
              onClick={() => {
                const modal = modalForGroup(activeView, group);
                if (modal) {
                  appStoreActions.openModal(modal);
                }
              }}
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function modalForGroup(activeView: WorkspaceView, group: string) {
  if (activeView === 'class-diagram' && group === 'Classes') {
    return { type: 'addClass' as const };
  }

  if (activeView === 'class-diagram' && group === 'Associations') {
    return { type: 'addClassAssociation' as const };
  }

  if (activeView === 'class-diagram' && group === 'Invariants') {
    return { type: 'addInvariant' as const };
  }

  if (activeView === 'object-diagram' && group === 'Objects') {
    return { type: 'addObject' as const };
  }

  if (activeView === 'object-diagram' && group === 'Associations') {
    return { type: 'addObjectAssociation' as const };
  }

  return null;
}
