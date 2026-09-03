import { DocLayout } from './DocLayout';

export function DatatypesPage() {
  return (
    <DocLayout activeRoute="datatypes">
      <h1 className="doc-page-title">Datatypes</h1>
      <p className="doc-page-lead">
        Datatypes in USE define value types without persistent object identity. They encompass
        built-in primitive types as well as user-defined structured types, collections, and tuples.
      </p>

      <section className="doc-section" aria-labelledby="datatypes-overview">
        <h2 id="datatypes-overview">Overview &amp; Value Semantics</h2>
        <p>
          Unlike UML Classes, which represent stateful entities with unique object identifiers
          (OIDs) and lifecycles, <strong>DataTypes</strong> represent pure values. Two data type
          instances with identical field values are considered identical and interchangeable.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Value Equality</strong>
            <p>
              Data types do not have independent object identities. They are compared and evaluated
              strictly by their internal values.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Diagram Stereotype</strong>
            <p>
              Custom data types appear on the Class Diagram canvas as classifier boxes labeled with
              the <code>&laquo;dataType&raquo;</code> stereotype.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>No Object Instances</strong>
            <p>
              You do not instantiate standalone objects for DataTypes in the Object Diagram; rather,
              they exist as structured values inside object slots.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="built-in-primitives">
        <h2 id="built-in-primitives">Built-in Primitive Types</h2>
        <p>
          USE provides standard primitive types ready to use across attributes and operations:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong><code>String</code></strong>
            <p>Textual sequences enclosed in single quotes when used in OCL (e.g. <code>'Active'</code>).</p>
          </div>
          <div className="doc-feature-card">
            <strong><code>Integer</code></strong>
            <p>Whole numerical values supporting standard arithmetic operators (<code>+</code>, <code>-</code>, <code>*</code>, <code>div</code>, <code>mod</code>).</p>
          </div>
          <div className="doc-feature-card">
            <strong><code>Real</code></strong>
            <p>Floating-point numbers for continuous values, measurements, and rates.</p>
          </div>
          <div className="doc-feature-card">
            <strong><code>Boolean</code></strong>
            <p>Logical values: <code>true</code> or <code>false</code>, supporting <code>and</code>, <code>or</code>, <code>not</code>, and <code>implies</code>.</p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="custom-datatypes">
        <h2 id="custom-datatypes">Custom &amp; Structured DataTypes</h2>
        <p>
          When primitive types are insufficient, you can construct custom DataTypes with multiple
          named <em>Value Properties</em>:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Click <strong>DataType</strong> in the canvas creation bar
          </li>
          <li>
            Open the <strong>DataType Properties Panel</strong> to name the type (e.g.{' '}
            <code>Money</code>, <code>GeoCoordinate</code>) and assign a package.
          </li>
          <li>
            Add properties using <em>Add Value Property</em>, giving each property a name and selecting
            its type with the <strong>TypePicker</strong>.
          </li>
          <li>
            The TypePicker supports building advanced structured types:
            <ul style={{ marginTop: '6px' }}>
              <li>
                <strong>Collections:</strong> <code>Set(T)</code>, <code>Sequence(T)</code>,{' '}
                <code>Bag(T)</code>, and <code>OrderedSet(T)</code>.
              </li>
              <li>
                <strong>Tuples:</strong> <code>Tuple(field1: Type1, field2: Type2)</code>.
              </li>
            </ul>
          </li>
          <li>
            Click <strong>Save DataType</strong> to commit the specification under revision control.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="using-datatypes">
        <h2 id="using-datatypes">Usage in Snapshots &amp; OCL</h2>
        <p>
          Structured DataTypes seamlessly integrate into the modelling and verification process:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Structured Object Slot Editors</strong>
            <p>
              In the Object Diagram, attributes typed with custom DataTypes provide structured
              nested editors where you fill each property individually, preserving valid types
              without requiring raw text parsing.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Navigation &amp; Expressions</strong>
            <p>
              Access properties of custom DataTypes with standard dot notation, such as:{' '}
              <code>self.price.amount &gt; 0</code> or{' '}
              <code>self.dimensions.width * self.dimensions.height</code>.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Reference-Aware Deletion</strong>
            <p>
              Like enumerations, deleting a DataType or one of its properties is strictly validated.
              Any dependent class attributes or invariant constraints block deletion until resolved.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
