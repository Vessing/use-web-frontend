import { afterEach, describe, expect, it } from 'vitest';

import { appStoreActions, getAppState } from './appStore';
import type { ValidationResultDto } from '../api/dtos';

afterEach(() => {
  appStoreActions.reset();
});

describe('appStoreActions', () => {
  it('stores the current diagram selection', () => {
    appStoreActions.select({
      view: 'class-diagram',
      type: 'class',
      id: 'class-user',
    });

    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'class',
      id: 'class-user',
    });

    appStoreActions.clearSelection();

    expect(getAppState().selection).toBeNull();
  });

  it('opens and closes modal state', () => {
    appStoreActions.openModal({
      type: 'addInvariant',
      contextClassId: 'class-user',
    });

    expect(getAppState().modal).toEqual({
      type: 'addInvariant',
      contextClassId: 'class-user',
    });

    appStoreActions.closeModal();

    expect(getAppState().modal).toBeNull();
  });

  it('marks layout drafts dirty when node positions change', () => {
    appStoreActions.updateNodeLayout('class-diagram', 'class-user', {
      x: 120,
      y: 80,
    });

    expect(getAppState().layoutDraft.dirty).toBe(true);
    expect(getAppState().layoutDraft.classDiagram.nodes).toEqual([
      { elementId: 'class-user', x: 120, y: 80 },
    ]);

    appStoreActions.markLayoutSaved();

    expect(getAppState().layoutDraft.dirty).toBe(false);
  });

  it('indexes validation results by affected element ids', () => {
    const result: ValidationResultDto = {
      status: 'INVALID',
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        checkedInvariantCount: 1,
        checkedObjectCount: 1,
      },
      errors: [
        {
          id: 'error-max-books',
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
          message: 'maxBooks invariant failed',
          targets: [{ elementType: 'OBJECT', elementId: 'object-alice' }],
          contextObjectId: 'object-alice',
          invariantId: 'invariant-max-books',
        },
      ],
      finishedAt: '2026-07-22T20:00:00.000Z',
    };

    appStoreActions.setValidationResult(result);

    expect(getAppState().activeBottomPanelTab).toBe('validation-results');
    expect(getAppState().validation.stale).toBe(false);
    expect(getAppState().validation.markersByElementId['object-alice']).toEqual([
      {
        errorId: 'error-max-books',
        code: 'INVARIANT_VIOLATION',
        severity: 'ERROR',
        targetType: 'OBJECT',
      },
    ]);
    expect(
      getAppState().validation.markersByElementId['invariant-max-books'],
    ).toEqual([
      {
        errorId: 'error-max-books',
        code: 'INVARIANT_VIOLATION',
        severity: 'ERROR',
        targetType: 'INVARIANT',
      },
    ]);

    appStoreActions.markValidationStale();

    expect(getAppState().validation.stale).toBe(true);
  });

  it('clears validation markers when a later result is valid', () => {
    appStoreActions.setValidationResult({
      status: 'INVALID',
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [
        {
          id: 'error-max-books',
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
          message: 'maxBooks invariant failed',
          targets: [{ elementType: 'OBJECT', elementId: 'object-alice' }],
        },
      ],
    });

    expect(getAppState().validation.markersByElementId['object-alice']).toHaveLength(1);

    appStoreActions.setValidationResult({
      status: 'VALID',
      summary: {
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [],
    });

    expect(getAppState().validation.markersByElementId).toEqual({});
  });

  it('removes selection, layout and validation references for deleted elements', () => {
    appStoreActions.select({
      view: 'object-diagram',
      type: 'object',
      id: 'object-alice',
    });
    appStoreActions.updateNodeLayout('object-diagram', 'object-alice', {
      x: 80,
      y: 120,
    });
    appStoreActions.setValidationResult({
      status: 'INVALID',
      summary: {
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [
        {
          id: 'error-object',
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
          message: 'maxBooks invariant failed',
          targets: [{ elementType: 'OBJECT', elementId: 'object-alice' }],
          contextObjectId: 'object-alice',
        },
        {
          id: 'error-link',
          code: 'INVALID_LINK',
          severity: 'ERROR',
          message: 'Object link is invalid.',
          targets: [{ elementType: 'OBJECT_LINK', elementId: 'link-borrows-1' }],
          linkId: 'link-borrows-1',
        },
      ],
    });

    appStoreActions.removeElementReferences(['object-alice']);

    expect(getAppState().selection).toBeNull();
    expect(getAppState().layoutDraft.objectDiagram.nodes).toEqual([]);
    expect(getAppState().validation.result?.errors).toEqual([
      expect.objectContaining({ id: 'error-link' }),
    ]);
    expect(getAppState().validation.result?.summary).toMatchObject({
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
    });
    expect(getAppState().validation.markersByElementId['object-alice']).toBeUndefined();
    expect(getAppState().validation.markersByElementId['link-borrows-1']).toHaveLength(1);
  });

  it('stores console entries for workspace feedback', () => {
    appStoreActions.addConsoleLog({
      id: 'log-start-project',
      timestamp: '2026-07-22T20:00:00.000Z',
      level: 'info',
      source: 'api',
      message: 'Project created',
    });

    expect(getAppState().consoleLogs).toEqual([
      {
        id: 'log-start-project',
        timestamp: '2026-07-22T20:00:00.000Z',
        level: 'info',
        source: 'api',
        message: 'Project created',
      },
    ]);
  });
});
