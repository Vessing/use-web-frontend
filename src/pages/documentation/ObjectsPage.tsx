import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function ObjectsPage() {
  return (
    <DocLayout activeRoute="object-diagram/objects">
      <h1 className="doc-page-title">Objects &amp; Attribute Slots</h1>
      <p className="doc-page-lead">
        Objects are concrete runtime instances of classes in your UML model. In USE Web, each object
        resides within the current snapshot and contains slots representing its current attribute values.
      </p>

      <section className="doc-section" aria-labelledby="creating-objects">
        <h2 id="creating-objects">Creating Object Instances</h2>
        <p>
          To instantiate a new object in your current snapshot:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Click <strong>+ Object</strong> in the canvas toolbar or right-click on the canvas.
          </li>
          <li>
            Select the target <strong>Class</strong>. Only concrete classes can be instantiated; abstract
            classes are disabled.
          </li>
          <li>
            Enter a <strong>Unique Object Name</strong> (e.g. <code>alice</code> or <code>acc101</code>).
            Object names must be unique within the snapshot.
          </li>
          <li>
            Optionally provide initial values for the object's attribute slots.
          </li>
          <li>
            Confirm with <strong>Create Object</strong>. The backend executes a revision-protected
            creation command and renders the new node on the canvas.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="slots-and-inheritance">
        <h2 id="slots-and-inheritance">Slot Management &amp; Inheritance</h2>
        <p>
          When an object is selected, its <strong>Object Properties</strong> panel displays all stored
          attribute slots:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Declared Attributes</strong>
            <p>
              Attributes directly defined on the object's concrete classifier.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Inherited Attributes</strong>
            <p>
              If the class inherits from supertypes via generalization, the object node and panel
              automatically project all inherited attribute slots, grouped by defining classifier.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Derived vs. Stored Attributes</strong>
            <p>
              Only stored attributes hold editable slot state. Derived attributes are computed dynamically
              by the backend via their OCL expressions and displayed as read-only values.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="type-directed-editing">
        <h2 id="type-directed-editing">Type-Directed Value Editing</h2>
        <p>
          USE Web employs structured, type-directed editors rather than fragile raw text parsing:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Primitive Types</strong>
            <p>
              Dedicated controls for <code>Integer</code>, <code>Real</code>, <code>String</code>, and{' '}
              <code>Boolean</code> (checkbox or true/false toggle) with client-side and backend type
              validation.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Enumerations</strong>
            <p>
              Context-sensitive dropdown showing only declared literals for that specific enumeration.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>DataTypes &amp; Tuples</strong>
            <p>
              Structured nested forms allowing you to specify field-by-field values for complex types
              defined in the model.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Collections</strong>
            <p>
              Interactive collection builders for <code>Set</code>, <code>Bag</code>, <code>Sequence</code>,
              and <code>OrderedSet</code>. Supports adding/removing items, duplicate rejection for sets,
              and index ordering for sequences.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="object-deletion">
        <h2 id="object-deletion">Safe Object Deletion</h2>
        <p>
          Deleting an object removes its state from the active snapshot. Because objects may participate in
          links, USE Web provides an impact-aware deletion flow:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Impact Assessment:</strong> Clicking <em>Delete Object</em> triggers a backend analysis
            of all attached object links and dependent association classes.
          </li>
          <li>
            <strong>Explicit Cascade Confirmation:</strong> Connected links are reviewed. If allowed,
            cascading link removals are confirmed before applying the change.
          </li>
          <li>
            <strong>Referential Integrity:</strong> If deleting an object would leave mandatory composition
            hierarchies or references in an inconsistent state without cascade, the operation is blocked.
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
              Learn how to connect objects using association links, configure qualifiers, and model
              association class instances.
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
              Learn how to execute operations on objects, pass arguments, and inspect state transitions.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
