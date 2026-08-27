import { useState } from 'react';

interface CreateNewProjectModalProps {
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => Promise<void>;
}

export function CreateNewProjectModal({
  error,
  isCreating,
  isOpen,
  onClose,
  onCreateProject,
}: CreateNewProjectModalProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFieldError('Project name is required.');
      return;
    }

    setFieldError(null);
    await onCreateProject(trimmedName);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-dialog create-project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-modal-title"
      >
        <header className="modal-header">
          <h2 id="create-project-modal-title">Create New Project</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            disabled={isCreating}
            onClick={onClose}
          >
            x
          </button>
        </header>
        <div className="modal-body">
          <p className="modal-empty">
            Name the UML/OCL model before creating the initial empty project.
          </p>
          <label className="modal-field" htmlFor="create-project-name">
            Project Name
            <input
              id="create-project-name"
              type="text"
              autoFocus
              value={name}
              aria-invalid={fieldError ? 'true' : undefined}
              aria-describedby={fieldError ? 'create-project-name-error' : undefined}
              disabled={isCreating}
              onChange={(event) => {
                setName(event.currentTarget.value);
                if (fieldError) {
                  setFieldError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSubmit();
                }
              }}
            />
          </label>
          {fieldError ? (
            <p id="create-project-name-error" className="modal-form-error" role="alert">
              {fieldError}
            </p>
          ) : null}
          {error ? (
            <p className="modal-form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button type="button" disabled={isCreating} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isCreating}
            onClick={handleSubmit}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </footer>
      </section>
    </div>
  );
}
