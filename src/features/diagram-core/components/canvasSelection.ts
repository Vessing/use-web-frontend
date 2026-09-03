import type { WorkspaceView } from '../../../app/navigation';
import type { SelectionState } from '../../../state';
import type { DiagramElementKind } from '../types';

export function selectionFor(
  activeView: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>,
  ref: { elementType: DiagramElementKind; elementId: string },
): SelectionState {
  if (
    activeView === 'class-diagram' &&
    (ref.elementType === 'class' || ref.elementType === 'association' || ref.elementType === 'enumeration' || ref.elementType === 'dataType')
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
