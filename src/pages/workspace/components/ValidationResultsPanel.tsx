import type { ProjectDto, ValidationErrorDto } from '../../../api';
import { appStoreActions, type ValidationUiState } from '../../../state';
import {
  collectValidationMessages,
  formatDetails,
  formatSelectionFocusLabel,
  formatValidationContextLabels,
  formatValidationMessageSummary,
  resolveValidationErrorSelection,
  type ValidationMessage,
} from './validationResults';

interface ValidationResultsPanelProps {
  validation: ValidationUiState;
  project?: ProjectDto | null;
}

export function ValidationResultsPanel({
  validation,
  project = null,
}: ValidationResultsPanelProps) {
  const result = validation.result;
  const messages = collectValidationMessages(result);

  if (!result) {
    return (
      <div className="validation-results-empty">
        <strong>No validation run yet.</strong>
        <p>Use Check Constraints to validate the current UML model and snapshot.</p>
      </div>
    );
  }

  return (
    <div className="validation-results-panel">
      <ValidationSummary validation={validation} messageCount={messages.length} />
      {messages.length === 0 ? (
        <div className="validation-results-valid" role="status">
          <strong>No validation issues found.</strong>
          <p>The backend reported the current project state as {result.status}.</p>
        </div>
      ) : (
        <ul className="validation-error-list" aria-label="Validation errors">
          {messages.map((message) => (
            <ValidationErrorItem
              key={message.id}
              message={message}
              project={project}
              selected={validation.selectedErrorId === message.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ValidationSummaryProps {
  validation: ValidationUiState;
  messageCount: number;
}

function ValidationSummary({ validation, messageCount }: ValidationSummaryProps) {
  const result = validation.result;

  if (!result) {
    return null;
  }

  return (
    <header className="validation-summary">
      <div>
        <span className={`validation-status validation-status-${result.status.toLowerCase()}`}>
          {result.status}
        </span>
        {validation.stale ? <span className="validation-stale">Stale</span> : null}
      </div>
      <dl className="validation-summary-counts" aria-label="Validation summary">
        <div>
          <dt>Errors</dt>
          <dd>{result.summary.errorCount}</dd>
        </div>
        <div>
          <dt>Warnings</dt>
          <dd>{result.summary.warningCount}</dd>
        </div>
        <div>
          <dt>Infos</dt>
          <dd>{result.summary.infoCount}</dd>
        </div>
      </dl>
      <p>
        {messageCount === 0
          ? 'The latest validation result contains no messages.'
          : `${messageCount} validation message(s) returned by the backend.`}
      </p>
    </header>
  );
}

interface ValidationErrorItemProps {
  message: ValidationMessage;
  project: ProjectDto | null;
  selected: boolean;
}

function ValidationErrorItem({
  message,
  project,
  selected,
}: ValidationErrorItemProps) {
  const targetSelection = resolveValidationErrorSelection(message);
  const contextLabels = formatValidationContextLabels(message, project);

  function handleSelectError(error: ValidationErrorDto) {
    appStoreActions.selectValidationError(error.id);

    const selection = resolveValidationErrorSelection(error);
    if (selection) {
      appStoreActions.select(selection);
    }
  }

  return (
    <li className={`validation-error-item ${selected ? 'selected' : ''}`}>
      <button
        type="button"
        className="validation-error-button"
        onClick={() => handleSelectError(message)}
        aria-pressed={selected}
      >
        <span className={`validation-severity validation-severity-${message.severity.toLowerCase()}`}>
          {message.severity}
        </span>
        <span>
          <strong>{message.code}</strong>
          <span>{formatValidationMessageSummary(message, project)}</span>
          <small>{message.userMessage ?? message.message}</small>
        </span>
      </button>
      <div className="validation-error-details">
        <span>Group: {message.messageGroup}</span>
        {contextLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
        {targetSelection ? (
          <span>Focus: {formatSelectionFocusLabel(targetSelection, project)}</span>
        ) : (
          <span>Focus: no mapped UI element</span>
        )}
        {message.expression ?? message.oclExpression ? (
          <span>Expression: {message.expression ?? message.oclExpression}</span>
        ) : null}
        {message.suggestedFix ? <span>Suggested fix: {message.suggestedFix}</span> : null}
        {formatDetails(message.details) ? <span>Details: {formatDetails(message.details)}</span> : null}
      </div>
    </li>
  );
}
