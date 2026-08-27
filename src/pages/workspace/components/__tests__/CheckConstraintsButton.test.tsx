import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { vi } from 'vitest';

import { ApiClientError, type ValidationResultDto } from '../../../../api';
import { appStoreActions, getAppState } from '../../../../state';
import { CheckConstraintsButton } from '../CheckConstraintsButton';

describe('CheckConstraintsButton', () => {
  beforeEach(() => {
    appStoreActions.reset();
  });

  it('calls the backend validation API and stores the result', async () => {
    const user = userEvent.setup();
    const validationResult: ValidationResultDto = {
      status: 'INVALID',
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [
        {
          id: 'err-maxbooks-alice',
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
          message: 'Invariant maxBooks is violated for object alice.',
          userMessage: 'alice verletzt die Invariante maxBooks.',
          contextObjectId: 'obj-alice',
          invariantId: 'inv-max-books',
          targets: [{ elementType: 'OBJECT', elementId: 'obj-alice' }],
        },
      ],
      warnings: [],
      infos: [],
      finishedAt: '2026-07-24T12:00:00Z',
    };
    const validateProject = vi.fn(async () => validationResult);

    render(
      <CheckConstraintsButton
        projectId="project-library"
        validateProject={validateProject}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Check Constraints' }));

    await waitFor(() => {
      expect(validateProject).toHaveBeenCalledWith('project-library', {
        mode: 'FULL_PROJECT',
      });
    });
    expect(getAppState().validation.result).toBe(validationResult);
    expect(getAppState().validation.stale).toBe(false);
    expect(getAppState().validation.markersByElementId['obj-alice']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVARIANT_VIOLATION',
          severity: 'ERROR',
        }),
      ]),
    );
    expect(getAppState().activeBottomPanelTab).toBe('validation-results');
    expect(getAppState().consoleLogs.at(-1)?.message).toContain(
      'Validation completed: INVALID',
    );
  });

  it('logs API errors without creating a validation result', async () => {
    const user = userEvent.setup();
    const validateProject = vi.fn(async () => {
      throw new ApiClientError(404, {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
        userMessage: 'Das Projekt konnte nicht gefunden werden.',
        timestamp: '2026-07-24T12:00:00Z',
      });
    });

    render(
      <CheckConstraintsButton
        projectId="missing-project"
        validateProject={validateProject}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Check Constraints' }));

    await waitFor(() => {
      expect(validateProject).toHaveBeenCalled();
    });
    expect(getAppState().validation.result).toBeNull();
    expect(getAppState().activeBottomPanelTab).toBe('console');
    expect(getAppState().consoleLogs.at(-1)).toMatchObject({
      level: 'error',
      source: 'api',
      message: 'PROJECT_NOT_FOUND: Das Projekt konnte nicht gefunden werden.',
    });
  });
});
