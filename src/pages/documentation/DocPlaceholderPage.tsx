import type { DocRoute } from '../../app/navigation';
import { DocLayout } from './DocLayout';

interface DocPlaceholderPageProps {
  activeRoute: DocRoute;
  title: string;
}

export function DocPlaceholderPage({ activeRoute, title }: DocPlaceholderPageProps) {
  return (
    <DocLayout activeRoute={activeRoute}>
      <h1 className="doc-page-title">{title}</h1>
      <p className="doc-page-lead doc-page-coming-soon">
        This page is coming soon. Content will be added here step by step.
      </p>
    </DocLayout>
  );
}
