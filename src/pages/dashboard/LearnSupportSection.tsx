import { navigateTo } from '../../app/browserRouter';

export function LearnSupportSection() {
  return (
    <section className="dashboard-section support-section" aria-labelledby="learn-support-title">
      <h2 id="learn-support-title">Learn &amp; Support</h2>
      <div className="support-links">
        <a href="/docs" onClick={(event) => { event.preventDefault(); navigateTo('/docs'); }}>
          <span className="support-icon" aria-hidden="true" />
          <span>
            <strong>Documentation</strong>
            <small>Learn UML &amp; OCL</small>
          </span>
        </a>
      </div>
    </section>
  );
}
