import { DocLayout } from './DocLayout';

export function EnumerationsPage() {
  return (
    <DocLayout activeRoute="enumerations">
      <h1 className="doc-page-title">Enumerations</h1>
      <p className="doc-page-lead">
        Enumerations represent custom types comprising a distinct, ordered set of named literals.
        They provide type safety for states, categories, and fixed domain choices across your UML
        and OCL models.
      </p>

      <section className="doc-section" aria-labelledby="enum-overview">
        <h2 id="enum-overview">Overview &amp; Purpose</h2>
        <p>
          Instead of using generic strings or integers to track states (such as order status or
          priority levels), Enumerations restrict attributes to a strictly validated list of
          predefined values.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Type Safety</strong>
            <p>
              Attributes typed with an enumeration reject arbitrary values, eliminating typos and
              invalid state assignments.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Ordered Literals</strong>
            <p>
              Literals preserve a stable order (e.g. <code>OPEN</code>, <code>IN_PROGRESS</code>,{' '}
              <code>CLOSED</code>), which can be reordered at any time in the Properties panel.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Diagram Notation</strong>
            <p>
              Represented in the Class Diagram as classifier boxes annotated with the{' '}
              <code>&laquo;enumeration&raquo;</code> stereotype.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="managing-enums">
        <h2 id="managing-enums">Creating &amp; Editing Enumerations</h2>
        <p>
          You can create and configure enumerations through either the diagram canvas or the Model
          Explorer:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Click <strong>Enumeration</strong> in the canvas creation toolbar
          </li>
          <li>
            Select the enumeration on the canvas to open its <strong>Properties Panel</strong>.
          </li>
          <li>
            Configure the <strong>Name</strong> and assign an optional <strong>Package</strong>.
          </li>
          <li>
            Add literals by clicking <em>+ Add Literal</em>.
          </li>
          <li>
            Reorder literals using the <strong>Up</strong> and <strong>Down</strong> controls to
            maintain your intended domain sequence.
          </li>
          <li>
            Click <strong>Save Enumeration</strong> to persist your changes under revision
            protection.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="using-enums">
        <h2 id="using-enums">Using Enumerations in USE</h2>
        <p>
          Enumerations seamlessly integrate across all areas of the workspace:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Class Attributes</strong>
            <p>
              In the Class Diagram, pick the enumeration from the <em>Type Picker</em> dropdown
              when defining class attributes (e.g. <code>status : InvoiceStatus</code>).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Object Diagram Slot Values</strong>
            <p>
              When setting attribute values for an instantiated object, the editor provides a
              type-directed dropdown showing only the valid literals for that enumeration.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Invariants &amp; Expressions</strong>
            <p>
              Reference enumeration literals in OCL invariants using double colons, for example:{' '}
              <code>self.status = InvoiceStatus::paid</code> or{' '}
              <code>self.priority &lt;&gt; Priority::LOW</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="enum-deletion">
        <h2 id="enum-deletion">Safe Deletion &amp; Referential Integrity</h2>
        <p>
          USE Web protects model integrity with reference-aware deletion rules. An enumeration or
          individual literal cannot be deleted if active dependencies exist:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Dependency Blocker Inspection</strong>
            <p>
              If an attribute, object slot, or invariant still references the enumeration or one of
              its literals, the delete dialog highlights each blocker and offers navigation to
              resolve it first.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>No Silent Cascades</strong>
            <p>
              Deletions are never cascaded automatically. You must explicitly reassign or remove
              referencing fields before the enumeration can be deleted atomically.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
