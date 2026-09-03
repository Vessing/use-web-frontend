import { DocLayout } from './DocLayout';

export function ClassDetailsPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties/details">
      <h1 className="doc-page-title">Class Properties: Details</h1>
      <p className="doc-page-lead">
        The Details sub-panel manages the core identity, namespace hierarchy, accessibility, and
        abstract classification of a UML Class.
      </p>

      <section className="doc-section" aria-labelledby="details-overview">
        <h2 id="details-overview">Overview &amp; Location</h2>
        <p>
          Whenever you select a class on the Class Diagram canvas or within the Model Explorer, the{' '}
          <strong>Properties Panel</strong> displays on the right side of the workspace. Under the{' '}
          <em>Class</em> segment, click the <strong>Details</strong> tab to access these fundamental
          settings.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="fields-and-controls">
        <h2 id="fields-and-controls">Configurable Fields &amp; Controls</h2>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Class Name</strong>
            <p>
              The primary name of the class (e.g. <code>Student</code>, <code>Account</code>). Class
              names are required and conventionally written in PascalCase. Renaming a class
              immediately updates all referencing associations, invariants, and canvas nodes.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Qualified Name (Read-Only)</strong>
            <p>
              Displays the full path including package namespaces (e.g.{' '}
              <code>university::people::Student</code>). This name is used in multi-package models,
              imports, and OCL expressions to avoid ambiguity.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Class Visibility</strong>
            <p>
              Specifies the access level of the classifier (e.g. <code>PUBLIC</code>,{' '}
              <code>PACKAGE</code>, <code>PROTECTED</code>, <code>PRIVATE</code>). Public classes can
              be imported and referenced by other packages or external projects.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Abstract Class Modifier</strong>
            <p>
              A toggle checkbox labeled <em>Abstract class</em>. Marking a class as abstract has two
              important effects:
            </p>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>
                <strong>Visual Notation:</strong> The class title is rendered in <em>italics</em> on
                the Class Diagram canvas according to standard UML convention.
              </li>
              <li>
                <strong>Instantiation Restriction:</strong> Abstract classes cannot be instantiated
                directly in the Object Diagram. Only concrete subclasses that inherit from them can
                have object instances in a snapshot.
              </li>
            </ul>
          </div>

          <div className="doc-feature-card">
            <strong>Package / Namespace Selector</strong>
            <p>
              A dropdown menu that allows moving the class between the <em>Project root</em> and any
              defined package. Moving a class updates its qualified name atomically under model
              revision protection.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Delete Class</strong>
            <p>
              Opens a confirmation dialog to delete the class. The backend atomically removes
              dependent associations, invariants, canvas layout entries, and any runtime object
              instances, preventing orphaned references.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="details-workflow">
        <h2 id="details-workflow">Recommended Workflow</h2>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Create a new class by clicking <strong>Class</strong> on the canvas creation toolbar.
          </li>
          <li>
            In the <strong>Details</strong> tab, provide a descriptive name and assign it to its
            appropriate package.
          </li>
          <li>
            If the class serves as a generalized base concept (e.g. <code>NamedElement</code>,{' '}
            <code>Vehicle</code>), check <em>Abstract class</em>.
          </li>
          <li>
            Proceed to the <strong>Attributes</strong> or <strong>Operations</strong> tabs to define
            the internal features of the class.
          </li>
        </ol>
      </section>
    </DocLayout>
  );
}
