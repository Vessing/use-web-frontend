import { DocLayout } from './DocLayout';

export function AssociationsPage() {
  return (
    <DocLayout activeRoute="class-diagram/associations">
      <h1 className="doc-page-title">Class Diagram: Associations</h1>
      <p className="doc-page-lead">
        Associations model relationships between classes — they define how instances are connected
        at runtime and determine which OCL navigation paths are available. USE Web supports
        binary associations, n-ary associations, aggregations, compositions, and association
        classes.
      </p>

      <section className="doc-section" aria-labelledby="relationship-kinds">
        <h2 id="relationship-kinds">Relationship Kinds</h2>
        <p>
          The <em>Relationship Kind</em> shown at the top of the Association Properties panel is
          derived automatically from the end configuration:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Association</strong>
            <p>
              The default: exactly two ends, no aggregation. Drawn as a plain line between two
              classes on the canvas.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Shared Aggregation</strong>
            <p>
              At least one end has <em>Aggregation = Shared</em>. Drawn with a hollow diamond at
              the aggregate end. The part can belong to more than one whole.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Composition</strong>
            <p>
              At least one end has <em>Aggregation = Composition</em>. Drawn with a filled diamond.
              Parts are exclusively owned by one composite and are destroyed with it.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>N-ary Association</strong>
            <p>
              More than two ends. Drawn as a diamond node connected to all participating
              classes. Use <em>Add Association End</em> to extend a binary association to n-ary.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Class</strong>
            <p>
              A class linked to an association — it can carry additional attributes and operations
              on the relationship itself. Assign an existing class or create a new one via{' '}
              <em>Create Association Class</em>.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="association-ends">
        <h2 id="association-ends">Association Ends</h2>
        <p>
          Each end card can be expanded to configure the full set of UML end properties:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Classifier</strong>
            <p>
              The class this end is attached to. Changing the classifier re-targets the link
              to a different class in the model.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Role Name</strong>
            <p>
              Optional. A lowercase identifier used to navigate from the other end.
              For example, if the role is <code>orders</code>, OCL expressions can write{' '}
              <code>customer.orders</code>.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Multiplicity</strong>
            <p>
              UML notation: <code>1</code>, <code>0..1</code>, <code>1..*</code>, or{' '}
              <code>0..*</code>. Defines how many instances of the target class a source
              instance may be linked to. Validated immediately as you type.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Aggregation</strong>
            <p>
              Select <em>None</em>, <em>Shared aggregation</em>, or <em>Composition</em>.
              Controls the diamond symbol and ownership semantics of the end.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Navigable</strong>
            <p>
              When checked, the association can be navigated from the opposite end in OCL.
              The computed <em>Navigation result</em> type (e.g.{' '}
              <code>Set(Order)</code>) is shown read-only after backend validation.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Ordered / Unique</strong>
            <p>
              <em>Ordered</em> stores links in insertion sequence (<code>OrderedSet</code> or{' '}
              <code>Sequence</code> in OCL). <em>Unique</em> (default on) prevents duplicate
              links at this end (<code>Set</code> vs <code>Bag</code>).
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="advanced-end-options">
        <h2 id="advanced-end-options">Advanced End Options</h2>
        <p>
          Click the expand toggle on an end card to access additional UML features:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Derived &amp; Union</strong>
            <p>
              Mark an end as <em>Derived</em> to indicate its value is computed from other
              relationships. A derived end may additionally be declared a <em>Union</em> —
              it then acts as the supertype end whose value is the union of all subsetting ends.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Subsets Ends</strong>
            <p>
              Declare that the link set of this end is always a subset of another end's link
              set. Use the checkbox list to select the ends being subsetted.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Redefines Ends</strong>
            <p>
              Explicitly redefine an inherited association end, narrowing its classifier or
              multiplicity in a subclass context.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Qualifiers</strong>
            <p>
              Attach named, typed qualifier attributes to an end. Qualifiers partition the
              link set: given a qualifier value, navigation returns a reduced target set.
              Supported types: <code>String</code>, <code>Integer</code>, <code>Real</code>,{' '}
              <code>Boolean</code>. Qualifiers can be reordered and removed.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="creating-associations">
        <h2 id="creating-associations">Creating &amp; Editing Associations</h2>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Draw on canvas:</strong> Select the association tool in the toolbar and
            click-drag between two classes to create a new binary association.
          </li>
          <li>
            <strong>Open properties:</strong> Click the association line on the canvas to select
            it and open the Association Properties panel.
          </li>
          <li>
            <strong>Name:</strong> Enter a UpperCamelCase name for the association (required).
          </li>
          <li>
            <strong>Configure each end:</strong> Expand the end card to set role name,
            multiplicity, aggregation kind, navigability, and advanced options.
          </li>
          <li>
            <strong>Add more ends:</strong> Click <em>Add Association End</em> to convert the
            association to n-ary.
          </li>
          <li>
            <strong>Apply Changes:</strong> Click <em>Apply Changes</em> to persist edits.
            The backend re-validates OCL navigation types and updates the canvas accordingly.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="ocl-navigation">
        <h2 id="ocl-navigation">OCL Navigation</h2>
        <p>
          After saving, each navigable end exposes a <strong>Navigation result</strong> type
          computed by the backend. This is the OCL collection type you use to navigate across
          the association in invariants, pre/post conditions, and definitions:
        </p>
        <pre className="doc-code-block">{`-- Navigable end "orders" on Customer, multiplicity 0..*
-- Navigation result: Set(Order)

context Customer
inv: self.orders->forAll(o | o.total >= 0)

-- Ordered end: navigation result becomes Sequence(Order)
-- Unique=false: navigation result becomes Bag(Order)`}</pre>
      </section>
    </DocLayout>
  );
}
