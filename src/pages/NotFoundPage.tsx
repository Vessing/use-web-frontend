import { navigateTo } from '../app/browserRouter';

export function NotFoundPage() {
  return (
    <main className="dashboard-page" aria-labelledby="not-found-title">
      <section className="dashboard-placeholder">
        <h1 id="not-found-title">Route nicht gefunden</h1>
        <p>Die angeforderte Ansicht ist in der aktuellen App Shell nicht bekannt.</p>
        <button type="button" className="primary-button" onClick={() => navigateTo('/dashboard')}>
          Zum Dashboard
        </button>
      </section>
    </main>
  );
}
