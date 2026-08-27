import { useState } from 'react';

import { ApiClientError } from '../api/client/apiError';

interface DeleteActionButtonProps {
  label: string;
  confirmMessage: string;
  onDelete: () => Promise<void>;
}

export function DeleteActionButton({
  label,
  confirmMessage,
  onDelete,
}: DeleteActionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (caughtError) {
      setError(toUserMessage(caughtError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="delete-action">
      <button
        type="button"
        className="danger-button"
        disabled={isDeleting}
        onClick={handleDelete}
      >
        {isDeleting ? 'Deleting...' : label}
      </button>
      {error ? <p className="property-field-error">{error}</p> : null}
    </div>
  );
}

function toUserMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.dto?.userMessage ?? error.dto?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The delete action failed.';
}
