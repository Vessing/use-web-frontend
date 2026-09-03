import { DocLayout } from './DocLayout';

export function InvariantsPage() {
  return (
    <DocLayout activeRoute="class-diagram/invariants">
      <h1 className="doc-page-title">Class Diagram: Invariants</h1>
      <p className="doc-page-lead">
        Invariants are named OCL constraints that must hold true for every instance of a class
        at all observable moments. They are the primary correctness mechanism in USE Web —
        the validator checks all invariants across the entire object snapshot and reports
        any violations.
      </p>

      <section className="doc-section" aria-labelledby="invariants-concept">
        <h2 id="invariants-concept">What Is an Invariant?</h2>
        <p>
          An invariant is a Boolean OCL expression written in the context of a specific class.
          Within the expression, <code>self</code> refers to the instance being checked.
          Every instance of the context class (including instances of subclasses) must satisfy
          the expression — if any instance violates it, the validator reports a failure with the
          offending object's name and class.
        </p>
        <pre className="doc-code-block">{`context Account
inv positiveBalance: self.balance >= 0

context Order
inv linesNotEmpty: self.lines->size() > 0

context Person
inv adultAge: self.age >= 18 implies self.hasIdDocument`}</pre>
      </section>

      <section className="doc-section" aria-labelledby="invariants-fields">
        <h2 id="invariants-fields">Invariant Fields</h2>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Invariant Name</strong>
            <p>
              A lowerCamelCase identifier unique within the project (e.g.{' '}
              <code>positiveBalance</code>). The name is required and appears in validation
              reports when the constraint is violated.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Context Class</strong>
            <p>
              The class whose instances the invariant applies to. Changing the context class
              triggers a confirmation dialog, because the backend must revalidate the OCL
              expression against the new class's attributes, operations, and associations.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Expression</strong>
            <p>
              A Boolean OCL expression. The field is required and validated by the backend on
              save — type errors and unresolved navigations are reported inline. The expression
              has access to <code>self</code> (bound to the context class), all OCL standard
              library operations, and any class definitions and associations in the model.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="invariants-workflow">
        <h2 id="invariants-workflow">Creating &amp; Editing Invariants</h2>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Select a class</strong> on the canvas and open the <strong>Invariant</strong>{' '}
            tab in the Class Properties panel (the top-level tab, not the feature sub-tab).
          </li>
          <li>
            Or open the <em>Invariants</em> sidebar entry and use the invariant list to select
            or create one independently of a class selection.
          </li>
          <li>Enter a unique <strong>Invariant Name</strong>.</li>
          <li>
            Choose the <strong>Context Class</strong> from the dropdown — it defaults to the
            currently selected class.
          </li>
          <li>
            Type the <strong>OCL expression</strong> in the text area. Use <code>self</code> to
            navigate the context class's features.
          </li>
          <li>
            Click <em>Apply Changes</em>. The backend parses and type-checks the expression
            and saves it at the current model revision. If the expression is invalid, field
            errors are shown inline.
          </li>
        </ol>
        <p>
          To <strong>discard</strong> unsaved edits, click <em>Discard</em> — the form resets
          to the last saved state.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="invariants-context-change">
        <h2 id="invariants-context-change">Changing the Context Class</h2>
        <p>
          If you select a different class in the <em>Context Class</em> dropdown, USE Web shows
          a confirmation dialog before saving. This is because the backend re-parses the entire
          OCL expression against the new class — any navigation paths or attribute references
          that do not exist on the new context class will be reported as errors.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="invariants-validation">
        <h2 id="invariants-validation">Running Validation</h2>
        <p>
          Invariants are evaluated against the Object Diagram snapshot during validation:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Trigger</strong>
            <p>
              Click <em>Validate</em> in the Object Diagram toolbar to run all invariants against
              all current objects. Validation is also marked stale automatically whenever you
              save an invariant or modify the object snapshot.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Scope</strong>
            <p>
              Every invariant is checked against every instance of its context class (and all
              subclass instances). A single failing instance causes the invariant to report as
              violated.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Results</strong>
            <p>
              The validation panel shows each invariant's result: <em>satisfied</em> (all
              instances passed), <em>violated</em> (one or more instances failed, with the
              offending object listed), or <em>undefined</em> (the expression evaluated to{' '}
              <code>OclUndefined</code> for at least one instance, usually caused by a
              navigation that returned null).
            </p>
          </div>
        </div>
        <pre className="doc-code-block">{`-- Example validation output:
-- checking invariant (1) 'Account::positiveBalance':
--   Invariant 'positiveBalance' is satisfied.
-- checking invariant (2) 'Order::linesNotEmpty':
--   -> false : Boolean
--   Invariant 'linesNotEmpty' is violated for object "order1".`}</pre>
      </section>

      <section className="doc-section" aria-labelledby="invariants-ocl-tips">
        <h2 id="invariants-ocl-tips">OCL Expression Tips</h2>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Use <code>-&gt;forAll(x | ...)</code> to assert a condition over a collection.
          </li>
          <li>
            Use <code>-&gt;exists(x | ...)</code> to assert that at least one element satisfies
            a condition.
          </li>
          <li>
            Use <code>implies</code> for conditional constraints:{' '}
            <code>self.isStudent implies self.age &lt; 30</code>.
          </li>
          <li>
            Reusable sub-expressions can be extracted into class <strong>Definitions</strong>{' '}
            and referenced by name inside the invariant body.
          </li>
          <li>
            The <code>oclIsTypeOf(T)</code> and <code>oclIsKindOf(T)</code> operations allow
            type-specific guards within a shared superclass invariant.
          </li>
        </ul>
      </section>
    </DocLayout>
  );
}
