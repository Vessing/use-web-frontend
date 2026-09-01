import { useState } from 'react';

import { ApiClientError, validationApi, type ValidationResultDto } from '../../../api';
import { appStoreActions } from '../../../state';

interface CheckConstraintsButtonProps {
  projectId: string;
  validateProject?: typeof validationApi.validateProject;
}

export function CheckConstraintsButton({
  projectId,
  validateProject = validationApi.validateProject,
}: CheckConstraintsButtonProps) {
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheckConstraints() {
    setIsChecking(true);
    appStoreActions.beginValidation();
    appStoreActions.addConsoleLog({
      level: 'info',
      source: 'validation',
      message: `Check Constraints started for project ${projectId}.`,
    });

    try {
      const result: ValidationResultDto = await validateProject(projectId, {
        mode: 'FULL_PROJECT',
      });

      appStoreActions.setValidationResult(result);
      appStoreActions.addConsoleLog({
        level: result.status === 'VALID' ? 'info' : 'warning',
        source: 'validation',
        message: formatValidationCompletedMessage(result),
      });
    } catch (error) {
      const message = formatValidationErrorMessage(error);
      appStoreActions.setValidationError(message);
      appStoreActions.addConsoleLog({
        level: 'error',
        source: 'api',
        message,
      });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <button
      type="button"
      className="primary-button"
      onClick={handleCheckConstraints}
      disabled={isChecking}
      aria-busy={isChecking}
    >
      {isChecking ? 'Checking...' : 'Check Constraints'}
    </button>
  );
}

function formatValidationCompletedMessage(result: ValidationResultDto) {
  const { errorCount, warningCount, infoCount } = result.summary;

  return `Validation completed: ${result.status} (${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info).`;
}

function formatValidationErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`;
  }

  if (error instanceof Error) {
    return `Check Constraints failed: ${error.message}`;
  }

  return 'Check Constraints failed: validation request did not complete.';
}
