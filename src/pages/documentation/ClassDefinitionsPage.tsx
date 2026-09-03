import { DocLayout } from './DocLayout';

export function ClassDefinitionsPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties/definitions">
      <h1 className="doc-page-title">Class Properties: Definitions</h1>
      <p className="doc-page-lead">
        Definitions let you attach reusable, named OCL expressions to a class. They act like
        derived helpers that can be referenced from invariants, operation bodies, and other
        OCL contexts — keeping your model concise and avoiding repetition.
      </p>

      <section className="doc-section" aria-labelledby="definitions-kinds">
        <h2 id="definitions-kinds">Definition Kinds</h2>
        <p>
          Each definition belongs to one of two kinds, switchable via the <em>Definition kind</em>{' '}
          toggle inside the Definitions tab:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Property Definition</strong>
            <p>
              A parameterless OCL expression derived from <code>self</code>. Behaves like a
              derived attribute: call it by name anywhere an OCL property is valid. No parameters
              are allowed; the kind toggle hides the parameter section automatically.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Operation Definition</strong>
            <p>
              An OCL expression that accepts an ordered parameter list. Behaves like an OCL
              helper operation: call it with arguments in the form{' '}
              <code>self.myHelper(arg1, arg2)</code>. Parameters have a name and a type and
              can be reordered with <em>Up</em> / <em>Down</em> or removed individually.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="definitions-fields">
        <h2 id="definitions-fields">Definition Fields</h2>
        <p>Every definition — regardless of kind — shares the same core fields:</p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Definition name</strong>
            <p>
              A lowerCamelCase identifier unique within the owning class. The qualified name is
              computed automatically as <code>ClassName::definitionName</code>.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Result type</strong>
            <p>
              The OCL type the expression must evaluate to (e.g. <code>Integer</code>,{' '}
              <code>Boolean</code>, <code>Set(Person)</code>). The backend validates that the
              expression is type-consistent with this declaration.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Context</strong>
            <p>
              Read-only field showing the owning class. For class-owned definitions, the OCL
              implicit variable <code>self</code> is bound to the owning class type and is always
              in scope within the expression.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL expression</strong>
            <p>
              The full OCL body evaluated when the definition is called. The hint below the
              textarea reminds you of the expected result type and the available{' '}
              <code>self</code> binding. Backend validation runs on save and highlights
              expression errors inline.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="definitions-parameters">
        <h2 id="definitions-parameters">Parameters (Operation Definitions)</h2>
        <p>
          When the kind is set to <em>Operation</em>, a <strong>Parameters</strong> subsection
          appears with the following actions:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Add Parameter:</strong> Appends a new parameter row. Each row has a{' '}
            <em>name</em> field and a <em>type</em> field.
          </li>
          <li>
            <strong>Reorder:</strong> Use the <em>Up</em> and <em>Down</em> buttons to change
            the argument order. Positions are stored explicitly so OCL call sites match the
            correct argument slots.
          </li>
          <li>
            <strong>Remove:</strong> Click <em>Remove</em> on any row to delete that parameter.
            Positions of remaining parameters are recomputed automatically.
          </li>
        </ul>
        <p>
          Inside the OCL expression, parameters are referenced by their declared name alongside{' '}
          <code>self</code>:
        </p>
        <pre className="doc-code-block">{`context Person
def: totalOrdersAbove(threshold : Integer) : Integer =
  self.orders->select(o | o.total > threshold)->size()`}</pre>
      </section>

      <section className="doc-section" aria-labelledby="definitions-workflow">
        <h2 id="definitions-workflow">Creating &amp; Editing Definitions</h2>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>Select a class on the canvas and open the <strong>Definitions</strong> tab.</li>
          <li>
            Click <em>Add Definition</em> (or select <em>New definition</em> from the picker)
            to open a blank form.
          </li>
          <li>Choose the <em>Definition kind</em> — Property or Operation.</li>
          <li>Fill in the <em>name</em>, <em>result type</em>, and <em>OCL expression</em>.</li>
          <li>
            For Operation definitions, add and order parameters before saving.
          </li>
          <li>
            Click <em>Create Definition</em> (new) or <em>Save Definition</em> (existing). The
            backend validates the OCL expression and reports any type errors inline.
          </li>
          <li>
            To switch between existing definitions, use the <em>Definition</em> dropdown at the
            top of the tab.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="definitions-delete">
        <h2 id="definitions-delete">Deleting Definitions</h2>
        <p>
          Click <em>Delete Definition</em> to open the impact dialog. Before deletion the
          backend analyses all references to the definition:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Blocking References</strong>
            <p>
              Elements that directly depend on this definition and cannot be auto-removed (e.g.
              an invariant whose body calls this helper). These are shown without a checkbox.
              You must update or delete those elements manually before the definition can be
              removed.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Cascade References</strong>
            <p>
              Elements that <em>can</em> be safely removed together with the definition (e.g. a
              derived property that wraps it). Tick the checkboxes for each cascade reference
              you consent to remove, then click <em>Delete Definition</em> to confirm.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
