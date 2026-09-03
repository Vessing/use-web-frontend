import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function ClassDiagramPage() {
  return (
    <DocLayout activeRoute="class-diagram">
      <h1 className="doc-page-title">Class Diagram</h1>
      <p className="doc-page-lead">
        The Class Diagram is the visual editor for the structural foundation of your USE
        specification. Here, you define classes, attributes, operation signatures, relationships,
        and domain constraints.
      </p>

      <section className="doc-section" aria-labelledby="class-diagram-overview">
        <h2 id="class-diagram-overview">Overview &amp; Purpose</h2>
        <p>
          In USE, the Class Diagram represents the formal blueprint of your system. It establishes
          the types, allowable links, and cardinality rules that every runtime object snapshot must
          satisfy.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Structural Schema</strong>
            <p>
              Declares the classifier inventory: classes, inheritance trees, associations, custom
              data types, and enumerations.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Canvas &amp; Explorer Synchronization</strong>
            <p>
              Selecting any classifier on the canvas automatically highlights it in the Model
              Explorer tree and activates its configuration in the Properties Panel.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Authoritative Model Text</strong>
            <p>
              Visual changes made in the Class Diagram immediately reflect in the canonical textual
              USE specification accessible via the OCL Editor.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="core-elements">
        <h2 id="core-elements">Core Diagram Elements</h2>
        <p>
          The Class Diagram view combines several key UML building blocks:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Classes &amp; Inheritance</strong>
            <p>
              Represent concrete entities or abstract base concepts. Classes can inherit properties
              and associations from supertypes via generalization links.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Attributes &amp; Operations</strong>
            <p>
              Define stored state and behavioral signatures. Attributes can be standard stored
              fields or derived dynamically using OCL calculation rules.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Associations &amp; Roles</strong>
            <p>
              Model relationships between classifiers with explicit end names (roles), multiplicity
              ranges (e.g. <code>0..1</code>, <code>1..*</code>), and aggregation or composition
              semantics.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Invariants</strong>
            <p>
              Enforce business rules and integrity conditions bound to a class context that cannot
              be expressed through graphical UML alone.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="sub-topics">
        <h2 id="sub-topics">Detailed Feature Guides</h2>
        <p>
          Because class diagrams involve rich configuration options and vocabulary, each major
          aspect is covered in detail in its own dedicated guide:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties');
                }}
              >
                Class Properties &rarr;
              </a>
            </strong>
            <p>
              Learn how to manage class names, abstract modifiers, primitive and custom typed
              attributes, derived OCL expressions, operation parameters, and generalization
              hierarchies.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/associations"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/associations');
                }}
              >
                Associations &rarr;
              </a>
            </strong>
            <p>
              Detailed guide on connecting classes, configuring role ends, defining multiplicity
              bounds, uniqueness and ordering flags, and association classes.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/invariants"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/invariants');
                }}
              >
                Invariants &rarr;
              </a>
            </strong>
            <p>
              Explore authoring OCL invariants on classes, syntax rules, self-navigation, and
              validating constraints against snapshots.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
