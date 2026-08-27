interface CreateNewModelCardProps {
  isCreating: boolean;
  onStartProject: () => void;
}

export function CreateNewModelCard({ isCreating, onStartProject }: CreateNewModelCardProps) {
  return (
    <section className="dashboard-card create-model-card" aria-labelledby="create-model-title">
      <div>
        <h1 id="create-model-title">Create New Model</h1>
        <p>Start a fresh UML project with class diagrams, object scenarios, and OCL constraints.</p>
        <button
          type="button"
          className="start-project-button"
          disabled={isCreating}
          onClick={onStartProject}
        >
          {isCreating ? 'Creating Project...' : '+ Start Project'}
        </button>
      </div>
      <div className="create-model-illustration" aria-hidden="true">
        <div className="window-line" />
        <div className="window-grid">
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
