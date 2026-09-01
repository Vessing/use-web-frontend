import { useSyncExternalStore } from 'react';

import type { WorkspaceView } from '../app/navigation';
import type {
  DiagramLayoutDto,
  ElementTypeDto,
  Id,
  NodeLayoutDto,
  SeverityDto,
  ValidationErrorCodeDto,
  ValidationErrorDto,
  ValidationResultDto,
  OperationInvocationResultDto,
} from '../api/dtos';

export type SelectionState =
  | {
      view: 'class-diagram';
      type: 'class' | 'association' | 'invariant' | 'package' | 'enumeration' | 'dataType';
      id: Id;
    }
  | {
      view: 'class-diagram';
      type: 'import';
      id: Id;
    }
  | {
      view: 'object-diagram';
      type: 'object' | 'objectLink';
      id: Id;
    }
  | {
      view: 'ocl';
      type: 'invariant';
      id: Id;
    }
  | null;

export type ModalState =
  | { type: 'addClass'; initialPosition?: { x: number; y: number } }
  | { type: 'addInvariant'; contextClassId?: Id }
  | { type: 'addClassAssociation'; sourceClassId?: Id; targetClassId?: Id }
  | { type: 'addPackage' }
  | { type: 'addImport' }
  | { type: 'addEnumeration' }
  | { type: 'addDataType' }
  | {
      type: 'deleteModelTypeElement';
      targetKind: 'ENUMERATION' | 'ENUMERATION_LITERAL' | 'DATATYPE' | 'DATATYPE_PROPERTY';
      elementId: Id;
      elementName: string;
      ownerId?: Id;
      ownerName?: string;
      position?: number;
      total?: number;
    }
  | { type: 'addObject'; classId?: Id }
  | {
      type: 'addObjectAssociation';
      associationId?: Id;
      sourceObjectId?: Id;
      targetObjectId?: Id;
    }
  | null;

export type BottomPanelTab =
  | 'console'
  | 'diagnostics'
  | 'validation-results'
  | 'invocation-results';

export interface ConsoleLogEntry {
  id: Id;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  source: 'api' | 'validation' | 'ocl' | 'ui';
  message: string;
}

export interface ValidationMarker {
  errorId: Id;
  code: ValidationErrorCodeDto;
  severity: SeverityDto;
  targetType: ElementTypeDto;
}

export interface ValidationUiState {
  result: ValidationResultDto | null;
  isLoading: boolean;
  error: string | null;
  stale: boolean;
  selectedErrorId: Id | null;
  markersByElementId: Record<Id, ValidationMarker[]>;
  lastCheckedAt?: string;
}

export interface LayoutDraftState {
  dirty: boolean;
  classDiagram: DiagramLayoutDto;
  objectDiagram: DiagramLayoutDto;
}

export interface AppState {
  selection: SelectionState;
  modal: ModalState;
  validation: ValidationUiState;
  layoutDraft: LayoutDraftState;
  activeBottomPanelTab: BottomPanelTab;
  consoleLogs: ConsoleLogEntry[];
  invocationResult: OperationInvocationResultDto | null;
}

const emptyDiagramLayout: DiagramLayoutDto = {
  nodes: [],
  edges: [],
};

const initialState: AppState = {
  selection: null,
  modal: null,
  validation: {
    result: null,
    isLoading: false,
    error: null,
    stale: false,
    selectedErrorId: null,
    markersByElementId: {},
  },
  layoutDraft: {
    dirty: false,
    classDiagram: emptyDiagramLayout,
    objectDiagram: emptyDiagramLayout,
  },
  activeBottomPanelTab: 'console',
  consoleLogs: [],
  invocationResult: null,
};

type Listener = () => void;

let currentState: AppState = initialState;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setAppState(updater: (state: AppState) => AppState) {
  const nextState = updater(currentState);

  if (Object.is(nextState, currentState)) {
    return;
  }

  currentState = nextState;
  emitChange();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppState() {
  return currentState;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(currentState),
    () => selector(initialState),
  );
}

function collectValidationMarkers(
  result: ValidationResultDto | null,
): Record<Id, ValidationMarker[]> {
  if (!result) {
    return {};
  }

  const markersByElementId: Record<Id, ValidationMarker[]> = {};
  const markerKeysByElementId = new Map<Id, Set<string>>();
  const allMessages = [...result.errors, ...(result.warnings ?? []), ...(result.infos ?? [])];

  for (const error of allMessages) {
    const directTargets = error.targets.map((target) => ({
      elementId: target.elementId,
      elementType: target.elementType,
    }));

    const inferredTargets = [
      error.contextObjectId
        ? { elementId: error.contextObjectId, elementType: 'OBJECT' as const }
        : null,
      error.invariantId
        ? { elementId: error.invariantId, elementType: 'INVARIANT' as const }
        : null,
      error.associationId
        ? { elementId: error.associationId, elementType: 'ASSOCIATION' as const }
        : null,
      error.linkId ? { elementId: error.linkId, elementType: 'OBJECT_LINK' as const } : null,
    ].filter(Boolean);

    for (const target of [...directTargets, ...inferredTargets]) {
      if (!target) {
        continue;
      }

      const marker: ValidationMarker = {
        errorId: error.id,
        code: error.code,
        severity: error.severity,
        targetType: target.elementType,
      };
      const markerKey = `${marker.errorId}:${marker.targetType}`;
      const existingMarkerKeys = markerKeysByElementId.get(target.elementId) ?? new Set<string>();

      if (existingMarkerKeys.has(markerKey)) {
        continue;
      }

      markersByElementId[target.elementId] = [
        ...(markersByElementId[target.elementId] ?? []),
        marker,
      ];
      existingMarkerKeys.add(markerKey);
      markerKeysByElementId.set(target.elementId, existingMarkerKeys);
    }
  }

  return markersByElementId;
}

function upsertNodeLayout(
  nodes: NodeLayoutDto[],
  elementId: Id,
  patch: Partial<Omit<NodeLayoutDto, 'elementId'>>,
) {
  const existingIndex = nodes.findIndex((node) => node.elementId === elementId);

  if (existingIndex === -1) {
    return [...nodes, { elementId, x: patch.x ?? 0, y: patch.y ?? 0, ...patch }];
  }

  return nodes.map((node, index) => (index === existingIndex ? { ...node, ...patch } : node));
}

function nowIsoString() {
  return new Date().toISOString();
}

function createLogEntry(
  entry: Omit<ConsoleLogEntry, 'id' | 'timestamp'> &
    Partial<Pick<ConsoleLogEntry, 'id' | 'timestamp'>>,
): ConsoleLogEntry {
  return {
    id: entry.id ?? `log-${crypto.randomUUID()}`,
    timestamp: entry.timestamp ?? nowIsoString(),
    level: entry.level,
    source: entry.source,
    message: entry.message,
  };
}

function selectionsEqual(left: SelectionState, right: SelectionState) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.view === right.view && left.type === right.type && left.id === right.id;
}

function validationErrorReferencesAny(error: ValidationErrorDto, elementIds: Set<Id>) {
  return [
    error.elementId,
    error.invariantId,
    error.contextClassId,
    error.contextObjectId,
    error.associationId,
    error.linkId,
    ...(error.relatedElementIds ?? []),
    ...error.targets.map((target) => target.elementId),
  ].some((elementId) => elementId && elementIds.has(elementId));
}

function removeValidationElementReferences(
  result: ValidationResultDto | null,
  elementIds: Set<Id>,
) {
  if (!result) {
    return null;
  }

  const errors = result.errors.filter((error) => !validationErrorReferencesAny(error, elementIds));
  const warnings = (result.warnings ?? []).filter(
    (error) => !validationErrorReferencesAny(error, elementIds),
  );
  const infos = (result.infos ?? []).filter(
    (error) => !validationErrorReferencesAny(error, elementIds),
  );

  return {
    ...result,
    errors,
    warnings,
    infos,
    summary: {
      ...result.summary,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: infos.length,
    },
  };
}

export const appStoreActions = {
  reset() {
    currentState = initialState;
    emitChange();
  },

  select(selection: SelectionState) {
    setAppState((state) =>
      selectionsEqual(state.selection, selection) ? state : { ...state, selection },
    );
  },

  clearSelection() {
    setAppState((state) => (state.selection === null ? state : { ...state, selection: null }));
  },

  removeElementReferences(elementIds: Id[]) {
    const ids = new Set(elementIds);

    if (ids.size === 0) {
      return;
    }

    setAppState((state) => {
      const result = removeValidationElementReferences(state.validation.result, ids);
      const selectedErrorId =
        result?.errors.some((error) => error.id === state.validation.selectedErrorId) ||
        result?.warnings?.some((error) => error.id === state.validation.selectedErrorId) ||
        result?.infos?.some((error) => error.id === state.validation.selectedErrorId)
          ? state.validation.selectedErrorId
          : null;

      return {
        ...state,
        selection: state.selection && ids.has(state.selection.id) ? null : state.selection,
        validation: {
          ...state.validation,
          result,
          selectedErrorId,
          markersByElementId: collectValidationMarkers(result),
        },
        layoutDraft: {
          ...state.layoutDraft,
          classDiagram: {
            ...state.layoutDraft.classDiagram,
            nodes: state.layoutDraft.classDiagram.nodes.filter((node) => !ids.has(node.elementId)),
            edges: state.layoutDraft.classDiagram.edges?.filter((edge) => !ids.has(edge.elementId)),
          },
          objectDiagram: {
            ...state.layoutDraft.objectDiagram,
            nodes: state.layoutDraft.objectDiagram.nodes.filter((node) => !ids.has(node.elementId)),
            edges: state.layoutDraft.objectDiagram.edges?.filter(
              (edge) => !ids.has(edge.elementId),
            ),
          },
        },
      };
    });
  },

  openModal(modal: Exclude<ModalState, null>) {
    setAppState((state) => ({ ...state, modal }));
  },

  closeModal() {
    setAppState((state) => ({ ...state, modal: null }));
  },

  setActiveBottomPanelTab(tab: BottomPanelTab) {
    setAppState((state) => ({ ...state, activeBottomPanelTab: tab }));
  },

  setValidationResult(result: ValidationResultDto) {
    setAppState((state) => ({
      ...state,
      activeBottomPanelTab: 'validation-results',
      validation: {
        result,
        isLoading: false,
        error: null,
        stale: false,
        selectedErrorId: null,
        markersByElementId: collectValidationMarkers(result),
        lastCheckedAt: result.finishedAt ?? result.checkedAt ?? nowIsoString(),
      },
    }));
  },

  beginValidation() {
    setAppState((state) => ({
      ...state,
      activeBottomPanelTab: 'validation-results',
      validation: { ...state.validation, isLoading: true, error: null, stale: true },
    }));
  },

  setValidationError(error: string) {
    setAppState((state) => ({
      ...state,
      activeBottomPanelTab: 'validation-results',
      validation: { ...state.validation, isLoading: false, error },
    }));
  },

  setInvocationResult(result: OperationInvocationResultDto) {
    setAppState((state) => ({
      ...state,
      activeBottomPanelTab: 'invocation-results',
      invocationResult: result,
    }));
  },

  clearInvocationResult() {
    setAppState((state) => ({ ...state, invocationResult: null }));
  },

  markValidationStale() {
    setAppState((state) => ({
      ...state,
      validation: { ...state.validation, stale: true },
    }));
  },

  selectValidationError(errorId: Id) {
    setAppState((state) => ({
      ...state,
      validation: { ...state.validation, selectedErrorId: errorId },
    }));
  },

  updateNodeLayout(
    diagram: Extract<WorkspaceView, 'class-diagram' | 'object-diagram'>,
    elementId: Id,
    patch: Partial<Omit<NodeLayoutDto, 'elementId'>>,
  ) {
    setAppState((state) => {
      const layoutKey = diagram === 'class-diagram' ? 'classDiagram' : 'objectDiagram';
      const diagramLayout = state.layoutDraft[layoutKey];

      return {
        ...state,
        layoutDraft: {
          ...state.layoutDraft,
          dirty: true,
          [layoutKey]: {
            ...diagramLayout,
            nodes: upsertNodeLayout(diagramLayout.nodes, elementId, patch),
          },
        },
      };
    });
  },

  markLayoutSaved() {
    setAppState((state) => ({
      ...state,
      layoutDraft: { ...state.layoutDraft, dirty: false },
    }));
  },

  addConsoleLog(
    entry: Omit<ConsoleLogEntry, 'id' | 'timestamp'> &
      Partial<Pick<ConsoleLogEntry, 'id' | 'timestamp'>>,
  ) {
    setAppState((state) => ({
      ...state,
      consoleLogs: [...state.consoleLogs, createLogEntry(entry)],
    }));
  },

  clearConsoleLogs() {
    setAppState((state) => ({ ...state, consoleLogs: [] }));
  },
};
