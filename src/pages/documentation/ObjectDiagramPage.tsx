import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function ObjectDiagramPage() {
  return (
    <DocLayout activeRoute="object-diagram">
      <h1 className="doc-page-title">Object Diagram</h1>
      <p className="doc-page-lead">
        The Object Diagram provides an interactive graphical canvas for modeling runtime object
        snapshots. Here, you instantiate concrete classes, assign attribute values, establish object
        links, execute operations, and validate constraints against live system states.
      </p>

      <section className="doc-section" aria-labelledby="object-diagram-overview">
        <h2 id="object-diagram-overview">Snapshots &amp; Runtime Verification</h2>
        <p>
          While the Class Diagram serves as the structural schema of your system, the Object Diagram
          captures a concrete instance of that schema at a single moment in time—referred to in USE as
          a <strong>snapshot</strong>.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Runtime State Modeling</strong>
            <p>
              Instantiate objects from concrete classes, populate their attribute slots with stored
              or structured values, and link them to test specific domain scenarios.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Independent Snapshot Life Cycle</strong>
            <p>
              Changes made in the Object Diagram affect only the current runtime snapshot. They do
              not alter the static textual USE class model or its schema definition.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Authoritative Constraint Validation</strong>
            <p>
              Triggering <em>Check Constraints</em> evaluates association multiplicities, class
              invariants, and operation contracts against the snapshot using the backend OCL engine.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="core-concepts">
        <h2 id="core-concepts">Core Diagram Elements</h2>
        <p>
          The Object Diagram visualizes the runtime elements and their interconnections:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Object Instances (Nodes)</strong>
            <p>
              Rendered with standard UML notation (<code>name : ClassName</code>). Object nodes display
              compartments for stored attribute slots, including inherited attributes and complex
              structured values.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Object Links (Edges)</strong>
            <p>
              Solid lines connecting objects that represent instances of UML associations. Supports
              binary links, diamond hub nodes for N-ary associations, and qualifiers at link ends.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Class Instances</strong>
            <p>
              When an association is modeled as an Association Class, its link exhibits both link and
              object characteristics, with dedicated slots displayed on the canvas.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Validation Error Highlighting</strong>
            <p>
              Objects and links that violate invariants or multiplicity bounds are immediately highlighted
              with red error borders and badges on the canvas, linking directly to the Validation Results panel.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="workspace-integration">
        <h2 id="workspace-integration">Workspace Architecture</h2>
        <p>
          The Object Diagram is tightly integrated into the USE Web workspace:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Creation Toolbar:</strong> Quickly spawn new objects via <em>+ Object</em> or connect
            instances via <em>+ Link</em> directly on the canvas.
          </li>
          <li>
            <strong>Model Explorer (Sidebar):</strong> Lists all active object instances and links grouped
            by their classifier types, providing quick selection and search capabilities.
          </li>
          <li>
            <strong>Object Properties Panel:</strong> Context-sensitive side panel with three main tabs:
            <strong>Object</strong> (slot values, identity, deletion), <strong>Associations</strong> (related
            links), and <strong>Operations</strong> (interactive invocation).
          </li>
          <li>
            <strong>Bottom Panel:</strong> Houses the <em>Validation Results</em>, <em>Invocation Results</em>,
            and <em>Console</em> tabs to monitor execution logs and detailed diagnostics.
          </li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="sub-topics">
        <h2 id="sub-topics">Detailed Feature Guides</h2>
        <p>
          Explore dedicated guides for each core capability of the Object Diagram:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/object-diagram/objects"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/object-diagram/objects');
                }}
              >
                Objects &rarr;
              </a>
            </strong>
            <p>
              Learn how to create objects, manage primitive, enumeration, and structured attribute slots,
              handle inherited fields, and safely delete instances.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/object-diagram/object-links"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/object-diagram/object-links');
                }}
              >
                Object Links &rarr;
              </a>
            </strong>
            <p>
              Guide on establishing links between objects, assigning association roles, configuring
              qualifier values, handling N-ary associations, and managing Association Classes.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>
              <a
                href="/docs/object-diagram/operation-invocation"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/object-diagram/operation-invocation');
                }}
              >
                Operation Invocation &rarr;
              </a>
            </strong>
            <p>
              Execute class operations interactively on runtime objects, supply typed arguments, inspect
              pre/postcondition evaluations, and review state modifications.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
