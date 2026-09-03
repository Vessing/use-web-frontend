import type { ReactNode } from 'react';
import { navigateTo } from '../../app/browserRouter';
import type { DocRoute } from '../../app/navigation';
import { DocSidebar } from './DocSidebar';

interface DocLayoutProps {
  activeRoute: DocRoute;
  children: ReactNode;
}

export function DocLayout({ activeRoute, children }: DocLayoutProps) {
  return (
    <main className="doc-page">
      <header className="doc-topbar">
        <button
          type="button"
          className="icon-button"
          aria-label="Back to dashboard"
          onClick={() => navigateTo('/dashboard')}
        >
          &lt;
        </button>
        <span className="doc-topbar-title">USE Web Documentation</span>
      </header>

      <div className="doc-layout">
        <DocSidebar activeRoute={activeRoute} />
        <article className="doc-content">
          {children}
        </article>
      </div>
    </main>
  );
}
