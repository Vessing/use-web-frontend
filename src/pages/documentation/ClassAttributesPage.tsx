import { DocLayout } from './DocLayout';

export function ClassAttributesPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties/attributes">
      <h1 className="doc-page-title">Class Properties: Attributes</h1>
      <p className="doc-page-lead">
        Attributes store structural state and calculated values within a Class. The Attributes
        editor supports primitive, collection, and tuple types, as well as initialization rules and
        derived OCL expressions.
      </p>

      <section className="doc-section" aria-labelledby="attributes-overview">
        <h2 id="attributes-overview">Overview &amp; Navigation</h2>
        <p>
          Select a class on the canvas and open the <strong>Attributes</strong> tab in the Class
          Properties panel. From the top dropdown, you can select any existing attribute to edit or
          click <strong>Add Attribute</strong> to create a new one.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="basic-configuration">
        <h2 id="basic-configuration">Name, Type &amp; Visibility</h2>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Attribute Name</strong>
            <p>
              The identifier for the attribute, conventionally written in lowerCamelCase (e.g.{' '}
              <code>firstName</code>, <code>balance</code>, <code>totalAmount</code>).
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Attribute Type (TypePicker)</strong>
            <p>
              Assign the attribute's type using the integrated <strong>TypePicker</strong>:
            </p>
            <ul style={{ marginTop: '6px', paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>
                <strong>Primitives:</strong> <code>String</code>, <code>Integer</code>,{' '}
                <code>Real</code>, <code>Boolean</code>.
              </li>
              <li>
                <strong>User Types:</strong> Model Enumerations and custom DataTypes.
              </li>
              <li>
                <strong>Collections &amp; Tuples:</strong> <code>Set(T)</code>,{' '}
                <code>Sequence(T)</code>, <code>Bag(T)</code>, or <code>Tuple(...)</code>.
              </li>
            </ul>
          </div>

          <div className="doc-feature-card">
            <strong>Visibility</strong>
            <p>
              Sets the access scope: <code>public (+)</code>, <code>protected (#)</code>,{' '}
              <code>package (~)</code>, or <code>private (-)</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="value-sources">
        <h2 id="value-sources">Value Sources: Stored, Init &amp; Derived</h2>
        <p>
          USE Web distinguishes how attribute values originate and behave at runtime:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Stored (Default)</strong>
            <p>
              Regular persistent state. Every instantiated object in the Object Diagram snapshot
              receives an editable slot for this attribute where concrete values are assigned.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Init Expression</strong>
            <p>
              An initial OCL expression evaluated once when an object is created. For example,{' '}
              <code>0</code> or <code>Date::now()</code>. The resulting slot receives this initial
              value upon instantiation but remains fully editable by the user.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Derived Attribute (<code>/name</code>)</strong>
            <p>
              Marked with a forward slash (e.g. <code>/totalPrice</code>). Derived attributes are
              calculated dynamically from an OCL expression evaluated against the current snapshot:
            </p>
            <pre style={{ margin: '10px 0', padding: '10px', background: '#1e293b', color: '#f8fafc', borderRadius: '6px' }}>
              <code>self.items-&gt;collect(price)-&gt;sum()</code>
            </pre>
            <p>
              Derived attributes have no writable slot in the Object Diagram; their values update
              automatically whenever the snapshot state changes.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="static-attributes">
        <h2 id="static-attributes">Static Attributes (Classifier Scope)</h2>
        <p>
          Checking <strong>Static attribute</strong> gives the attribute classifier-level scope
          (rendered with an underline in UML). A static attribute belongs to the class itself rather
          than individual object instances, allowing you to configure a shared constant or default
          directly in the Classifier Value Editor.
        </p>
      </section>
    </DocLayout>
  );
}
