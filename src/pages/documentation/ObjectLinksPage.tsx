import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function ObjectLinksPage() {
  return (
    <DocLayout activeRoute="object-diagram/object-links">
      <h1 className="doc-page-title">Object Links</h1>
      <p className="doc-page-lead">
        Object links represent runtime instances of UML associations connecting objects within a
        snapshot. They establish the concrete relationships, navigations, and structural links
        evaluated by OCL expressions and multiplicity constraints.
      </p>

      <section className="doc-section" aria-labelledby="creating-links">
        <h2 id="creating-links">Creating Object Links</h2>
        <p>
          You can create links between existing objects in your snapshot:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Click <strong>+ Link</strong> in the canvas toolbar or drag a connection handle between
            compatible object nodes on the canvas.
          </li>
          <li>
            In the link modal, select the desired <strong>Association</strong> defined in your class
            model.
          </li>
          <li>
            Assign the participating objects to each defined association end (e.g. <code>source</code> and{' '}
            <code>target</code>, or specific role names).
          </li>
          <li>
            If the association end is qualified, provide values for all required qualifiers.
          </li>
          <li>
            Confirm with <strong>Create Link</strong>. The link is validated against the schema and
            rendered on the canvas.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="link-types">
        <h2 id="link-types">Link Topologies &amp; Semantics</h2>
        <p>
          USE Web supports the full spectrum of UML association forms:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Binary Object Links</strong>
            <p>
              Direct lines connecting two object instances. Displays role names, navigation arrows,
              and multiplicity indicators.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>N-Ary Association Links</strong>
            <p>
              For associations connecting three or more ends, a diamond hub node is rendered on the
              canvas with branches extending to each participating object instance.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Qualified Association Links</strong>
            <p>
              When an association end uses a qualifier (e.g. <code>[accountNumber: String]</code>),
              the link explicitly records the qualifier value alongside the target object reference.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Class Instances</strong>
            <p>
              Links that represent Association Classes instantiate an accompanying link object. This
              object holds its own attribute slots and can be referenced in OCL expressions just like
              a standard object.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="link-properties-and-deletion">
        <h2 id="link-properties-and-deletion">Properties &amp; Deletion Lifecycle</h2>
        <p>
          Selecting a link on the canvas or in the Model Explorer opens the <strong>Object Link
          Properties</strong> panel:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>End Assignments</strong>
            <p>
              Inspect and reassign which object fills each association end, or update qualifier values.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Class State</strong>
            <p>
              Edit attribute values owned by the association class instance directly from the link's
              property view.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Safe Link Deletion</strong>
            <p>
              Clicking <em>Delete Link</em> checks deletion impact. If the link is an association class
              instance or participates in a composite relationship, dependent structures are reported
              and removed safely.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="validation">
        <h2 id="validation">Constraint &amp; Multiplicity Verification</h2>
        <p>
          Running <em>Check Constraints</em> verifies that the set of links in the current snapshot
          satisfies all association rules:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Multiplicity Bounds:</strong> Validates lower and upper bounds (e.g.{' '}
            <code>1..*</code> requires at least one link; <code>0..1</code> rejects multiple links for
            the same object end).
          </li>
          <li>
            <strong>OCL Navigation:</strong> Invariants navigating across associations (e.g.{' '}
            <code>self.accounts-&gt;size() &lt;= 3</code>) evaluate against the live graph formed by these
            links.
          </li>
          <li>
            <strong>Visual Error Badges:</strong> Links violating constraints are outlined in red, and
            detailed diagnostic codes appear in the Validation Results panel.
          </li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="navigation-links">
        <h2 id="navigation-links">Related Guides</h2>
        <p>
          Continue exploring snapshot modeling:
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
              Learn how to instantiate classes, manage attribute slots, and configure complex data types.
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
              Execute class operations interactively on runtime objects and review state transitions.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
