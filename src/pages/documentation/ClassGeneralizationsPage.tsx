import { DocLayout } from './DocLayout';

export function ClassGeneralizationsPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties/generalizations">
      <h1 className="doc-page-title">Class Properties: Generalizations</h1>
      <p className="doc-page-lead">
        Generalizations define inheritance relationships (is-a hierarchies) between Classes. Subclasses
        inherit all attributes, operations, and associations from their supertypes, enabling code reuse
        and polymorphic modelling.
      </p>

      <section className="doc-section" aria-labelledby="generalizations-overview">
        <h2 id="generalizations-overview">Overview &amp; Diagram Notation</h2>
        <p>
          In UML, a generalization connects a specialized <em>subclass</em> to a generalized{' '}
          <em>superclass</em> (supertype). On the Class Diagram canvas, it is rendered as a solid line
          with a hollow triangular arrowhead pointing toward the superclass.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Feature Inheritance</strong>
            <p>
              A subclass automatically inherits all attributes and operations declared in its
              supertypes, all the way up the ancestor chain.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Inheritance</strong>
            <p>
              Subclasses can participate in associations linked to any of their superclasses. In
              the Object Diagram, instances of a subclass can connect to links declared on supertypes.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Polymorphic Typing</strong>
            <p>
              Anywhere a supertype is expected (e.g. an attribute type, parameter, or association
              end), instances of any concrete subclass are valid substitutions.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="managing-generalizations">
        <h2 id="managing-generalizations">Managing Superclasses</h2>
        <p>
          Select a class and open the <strong>Generalizations</strong> tab in the Class Properties
          panel:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Add Generalization:</strong> Click <em>Add Generalization</em> to reveal available
            superclass candidates. Click any candidate to establish the inheritance link.
          </li>
          <li>
            <strong>Generalization Details:</strong> When a generalization is selected, inspect the{' '}
            <em>Subclass</em>, <em>Superclass</em>, and the complete <strong>Inheritance chain</strong>{' '}
            (e.g. <code>GraduateStudent &rarr; Student &rarr; Person</code>).
          </li>
          <li>
            <strong>Delete Generalization:</strong> Click <em>Delete generalization</em> to remove the
            link. Both classes remain intact; only the inheritance relationship is severed.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="inherited-features">
        <h2 id="inherited-features">Inherited Attributes &amp; Operations</h2>
        <p>
          The Generalizations tab provides clear inspection of all inherited features:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Read-Only Upstream Features</strong>
            <p>
              Inherited attributes and operations are displayed with their defining classifier (e.g.{' '}
              <em>Inherited from Person &middot; read-only</em>). To modify a feature's name, type, or
              parameters, select and edit its defining superclass directly.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Runtime Object Slots</strong>
            <p>
              When a subclass is instantiated in the Object Diagram snapshot, its object box displays
              slots for both locally defined attributes and all inherited attributes from its entire
              ancestor hierarchy.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Feature Redefinitions</strong>
            <p>
              If a subclass explicitly redefines an inherited feature (such as specializing its return
              type or query logic), the <em>Feature Resolution</em> section documents the exact
              redefinition target tracked by the backend.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="cycle-prevention">
        <h2 id="cycle-prevention">Inheritance Integrity &amp; Cycle Prevention</h2>
        <p>
          The USE Web backend continuously validates generalization hierarchies:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Cycle Detection:</strong> Circular inheritance (e.g. <code>A &rarr; B &rarr; A</code>){' '}
            is strictly prohibited and rejected by model commands.
          </li>
          <li>
            <strong>Self-Inheritance:</strong> A class cannot be declared as its own supertype.
          </li>
          <li>
            <strong>Abstract vs. Concrete:</strong> Concrete subclasses that inherit abstract operations
            must provide an implementation (or be marked abstract themselves).
          </li>
        </ul>
      </section>
    </DocLayout>
  );
}
