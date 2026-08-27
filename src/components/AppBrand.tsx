import { navigateTo } from '../app/browserRouter';

interface AppBrandProps {
  compact?: boolean;
}

export function AppBrand({ compact = false }: AppBrandProps) {
  return (
    <button
      type="button"
      className={compact ? 'app-brand app-brand-compact' : 'app-brand'}
      aria-label="Go to dashboard"
      onClick={() => navigateTo('/dashboard')}
    >
      <img className="app-brand-logo" src="/logo.png" alt="" aria-hidden="true" />
      {!compact ? (
        <span className="app-brand-text">
          <strong>USE</strong>
          <small>UML-based Specification Environment</small>
        </span>
      ) : null}
    </button>
  );
}
