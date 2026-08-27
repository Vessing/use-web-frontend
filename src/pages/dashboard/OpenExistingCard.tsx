interface OpenExistingCardProps {
  onOpenExisting: () => void;
}

export function OpenExistingCard({ onOpenExisting }: OpenExistingCardProps) {
  return (
    <button
      type="button"
      className="dashboard-card open-existing-card"
      aria-labelledby="open-existing-title"
      onClick={onOpenExisting}
    >
      <div className="dashboard-icon folder-icon" aria-hidden="true" />
      <h2 id="open-existing-title">Open Existing</h2>
      <p>Import .use files from your computer</p>
    </button>
  );
}
