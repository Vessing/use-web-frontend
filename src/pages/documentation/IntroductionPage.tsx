import { DocLayout } from './DocLayout';

export function IntroductionPage() {
  return (
    <DocLayout activeRoute="introduction">
      <h1 className="doc-page-title">Welcome to USE Web</h1>
      <p className="doc-page-lead">
        <strong>USE (UML-based Specification Environment)</strong> is a tool for modelling and
        analysing software systems using the Unified Modelling Language (UML) and the Object
        Constraint Language (OCL).
      </p>

      <section className="doc-section" aria-labelledby="intro-what">
        <h2 id="intro-what">What is USE Web?</h2>
        <p>
          Originally developed as a Java desktop application, <strong>USE Web</strong> brings
          these capabilities directly to your browser with a modern, collaborative interface.
          It lets developers, analysts, and students validate software designs early — ensuring
          conceptual integrity long before any production code is written.
        </p>
        <p>
          USE Web is not a technical migration of the original USE project. It is a new,
          independently built system that learns from USE's concepts and applies them in a
          clean, extensible web architecture.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="intro-concepts">
        <h2 id="intro-concepts">Core Concepts</h2>
        <p>The USE workflow revolves around three pillars:</p>

        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>1. Structural Modelling — Class Diagram</strong>
            <p>
              Define the blueprint of your system. Create Classes, define their Attributes and
              Operations, and establish structural relationships via Associations and
              Generalisations.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>2. Instantiation — Object Diagram</strong>
            <p>
              Create concrete "Snapshots" of your system at a specific point in time.
              Instantiate Objects from your classes, set attribute values, and connect objects
              with Links based on your defined associations.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>3. Constraint Validation — OCL</strong>
            <p>
              Write precise OCL invariants to enforce business rules. USE evaluates these
              expressions against your Object Diagram snapshot and instantly highlights
              any violations in the diagram and the Validation Results panel.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="intro-navigate">
        <h2 id="intro-navigate">Navigating This Documentation</h2>
        <p>
          Use the sidebar on the left to explore topics in depth. The documentation is
          organised by diagram type and feature. For example, the{' '}
          <em>Class Diagram → Associations</em> page explains multiplicities, roles, and
          navigability in detail.
        </p>
        <p>
          Start with the <strong>Workflow</strong> page for a step-by-step guide through a
          typical USE modelling session, or jump directly to the topic you need.
        </p>
      </section>
    </DocLayout>
  );
}
