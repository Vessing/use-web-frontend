export function LearnSupportSection() {
  return (
    <section className="dashboard-section support-section" aria-labelledby="learn-support-title">
      <h2 id="learn-support-title">Learn &amp; Support</h2>
      <div className="support-links">
        <a href="/docs" onClick={(event) => event.preventDefault()}>
          <span className="support-icon" aria-hidden="true" />
          <span>
            <strong>Documentation</strong>
            <small>Learn UML &amp; OCL</small>
          </span>
        </a>
        <a href="/examples" onClick={(event) => event.preventDefault()}>
          <span className="support-icon" aria-hidden="true" />
          <span>
            <strong>Examples</strong>
            <small>See real-world models</small>
          </span>
        </a>
      </div>
    </section>
  );
}
