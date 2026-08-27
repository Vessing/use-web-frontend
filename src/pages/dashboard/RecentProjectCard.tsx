import type { ProjectSummaryDto } from '../../api';

interface RecentProjectCardProps {
  isOpening: boolean;
  onOpenProject: (projectId: string) => void;
  project: ProjectSummaryDto;
}

export function RecentProjectCard({ isOpening, onOpenProject, project }: RecentProjectCardProps) {
  return (
    <button
      aria-label={`Open ${project.name}`}
      className="recent-project-card"
      disabled={isOpening}
      onClick={() => onOpenProject(project.id)}
      type="button"
    >
      <div className="recent-project-meta">
        <div className="dashboard-icon diagram-icon" aria-hidden="true" />
        <span>{isOpening ? 'Opening...' : updatedLabel(project.updatedAt)}</span>
      </div>
      <h3>{project.name}</h3>
      <p>{project.description ?? 'UML/OCL project'}</p>
    </button>
  );
}

function updatedLabel(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) {
    return 'Updated just now';
  }
  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours} h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `Updated ${diffDays} d ago`;
  }

  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
