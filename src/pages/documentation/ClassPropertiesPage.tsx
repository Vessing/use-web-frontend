import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function ClassPropertiesPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties">
      <h1 className="doc-page-title">Class Properties</h1>
      <p className="doc-page-lead">
        The Class Properties panel is the contextual configuration center for classifiers in your
        model. When a class is selected on the canvas or in the Model Explorer, this panel allows
        you to configure its identity, features, relationships, and invariants.
      </p>

      <section className="doc-section" aria-labelledby="properties-overview">
        <h2 id="properties-overview">Panel Architecture &amp; Top-Level Segments</h2>
        <p>
          At the top of the Class Properties panel, a segmented control divides the class's
          configuration into three primary perspectives:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Class Tab (Core Classifier)</strong>
            <p>
              The primary workspace for configuring the class itself, including its identity,
              stored and derived attributes, operation signatures, generalization links, and OCL
              definitions.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Tab (Connected Roles)</strong>
            <p>
              Quickly view and jump to all associations where this class participates as an end,
              showing multiplicities and remote role names.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Invariant Tab (Contextual Rules)</strong>
            <p>
              Inspect and manage all OCL invariants whose context is anchored to this class (e.g.{' '}
              <code>context ClassName inv ...</code>).
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="feature-tabs-overview">
        <h2 id="feature-tabs-overview">Feature Subpages</h2>
        <p>
          Within the main <strong>Class</strong> view, configuration is divided into five dedicated
          sub-panels. Explore each detailed guide below:
        </p>

        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties/details"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties/details');
                }}
              >
                1. Details &rarr;
              </a>
            </strong>
            <p>
              Manage class identity: class name, qualified name, visibility levels, package/namespace
              placement, the abstract class modifier, and safe class deletion.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties/attributes"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties/attributes');
                }}
              >
                2. Attributes &rarr;
              </a>
            </strong>
            <p>
              Configure stored attributes, primitive and structured types using the TypePicker,
              multiplicities, and derived attributes backed by OCL calculation expressions.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties/operations"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties/operations');
                }}
              >
                3. Operations &rarr;
              </a>
            </strong>
            <p>
              Define method signatures, return types, ordered parameter lists, and visibility
              specifiers used for method invocation and contract validation.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties/generalizations"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties/generalizations');
                }}
              >
                4. Generalizations &rarr;
              </a>
            </strong>
            <p>
              Establish inheritance relationships, add supertypes, inspect inherited read-only
              attributes and operations, and prevent inheritance cycles.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/class-diagram/properties/definitions"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/class-diagram/properties/definitions');
                }}
              >
                5. Definitions &rarr;
              </a>
            </strong>
            <p>
              Specify class-scoped OCL helper definitions (<code>def:</code>) and reusable query
              attributes or operations to simplify invariant expressions.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="properties-sync">
        <h2 id="properties-sync">Real-Time Synchronization &amp; Validation</h2>
        <p>
          Edits made inside the Class Properties panel are synchronized through authoritative backend
          model commands with revision tracking. Modifying a class immediately updates:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>The canvas classifier node and its compartment labels.</li>
          <li>The Model Explorer tree structure and package hierarchies.</li>
          <li>The canonical textual specification in the OCL Editor.</li>
          <li>Validation state, marking existing validation results as stale until re-evaluated.</li>
        </ul>
      </section>
    </DocLayout>
  );
}
