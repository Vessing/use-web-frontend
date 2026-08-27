import type { ProjectSummaryDto } from '../../api';
import { RecentProjectCard } from './RecentProjectCard';
import { navigateTo } from '../../app/browserRouter';

interface RecentProjectsSectionProps {
  isLoading: boolean;
  onOpenProject: (projectId: string) => void;
  openingProjectId: string | null;
  projects: ProjectSummaryDto[];
  recentProjectsError: string | null;
}

export function RecentProjectsSection({
  isLoading,
  onOpenProject,
  openingProjectId,
  projects,
  recentProjectsError,
}: RecentProjectsSectionProps) {
  return (
    <section className="dashboard-section" aria-labelledby="recent-projects-title">
      <div className="section-heading">
        <h2 id="recent-projects-title">Recent Projects</h2>
        <a
          href="/projects"
          onClick={(event) => {
            event.preventDefault();
            navigateTo('/projects');
          }}
        >
          View all -&gt;
        </a>
      </div>
      {recentProjectsError ? <p className="dashboard-error">{recentProjectsError}</p> : null}
      {isLoading ? <p className="dashboard-muted">Loading recent projects...</p> : null}
      {!isLoading && projects.length === 0 ? (
        <p className="dashboard-muted">No recent projects yet.</p>
      ) : null}
      <div className="recent-projects-grid">
        {projects.map((project) => (
          <RecentProjectCard
            key={project.id}
            isOpening={openingProjectId === project.id}
            onOpenProject={onOpenProject}
            project={project}
          />
        ))}
      </div>
    </section>
  );
}
