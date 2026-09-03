import { DocLayout } from './DocLayout';

export function WorkflowPage() {
  return (
    <DocLayout activeRoute="workflow">
      <h1 className="doc-page-title">USE Modeling &amp; Validation Workflow</h1>
      <p className="doc-page-lead">
        A standard session in USE follows a clear, iterative lifecycle: create or import a model,
        specify structural rules and OCL constraints, instantiate an object snapshot, and validate
        consistency.
      </p>

      <section className="doc-section" aria-labelledby="step-1">
        <h2 id="step-1">1. Start or Import a Project</h2>
        <p>
          The workflow begins on the <strong>Dashboard</strong>. From here, you have three primary ways
          to begin:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Create New Model</strong>
            <p>
              Click <em>+ Start Project</em> to name a new project and initialize a clean workspace.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Open Existing / Import</strong>
            <p>
              Select <em>Open Existing</em> to upload or import an existing <code>.use</code> model
              specification or open a stored project.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Recent Projects</strong>
            <p>
              Directly resume work on previously edited models listed under <em>Recent Projects</em>.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="step-2">
        <h2 id="step-2">2. Describe the Class Model</h2>
        <p>
          In the <strong>Class Diagram</strong> view, build the domain structure of your application:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Classes &amp; Generalizations</strong>
            <p>
              Add classes onto the canvas, mark them as abstract if needed, and define inheritance
              hierarchies using generalizations (supertypes).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Attributes &amp; Operations</strong>
            <p>
              Define typed attributes (primitives, custom datatypes, or enumerations) and operation
              signatures using the Class Properties Panel.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Associations</strong>
            <p>
              Connect classes with associations, specifying role names, multiplicities (e.g.{' '}
              <code>1</code>, <code>0..1</code>, <code>*</code>), navigability, and aggregation or
              composition kinds.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="step-3">
        <h2 id="step-3">3. Specify OCL Constraints</h2>
        <p>
          Complement the structural model with precise business logic using the Object Constraint
          Language (OCL):
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Class Invariants</strong>
            <p>
              Define invariants attached to classes that specify conditions every valid state must
              satisfy (e.g. <code>context Account inv NonNegativeBalance: self.balance &gt;= 0</code>).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Editor Synchronization</strong>
            <p>
              Switch to the full-width <strong>OCL Editor</strong> to inspect or edit the canonical
              textual USE model. Applying changes synchronizes back to diagrams and the Model
              Explorer.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="step-4">
        <h2 id="step-4">4. Create an Object Snapshot</h2>
        <p>
          Switch to the <strong>Object Diagram</strong> to instantiate and test your model against
          concrete runtime scenarios:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Instantiate Objects</strong>
            <p>
              Create named object instances corresponding to concrete classes in your class model.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Assign Slot Values</strong>
            <p>
              Provide values for attributes (including inherited attributes) matching their declared
              types.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Link Objects</strong>
            <p>
              Create links between objects representing instances of the defined associations.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="step-5">
        <h2 id="step-5">5. Validate &amp; Check Constraints</h2>
        <p>
          Run consistency checks by clicking the global <strong>Check Constraints</strong> action:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Automated Evaluation</strong>
            <p>
              The system validates UML structural rules (multiplicity limits, types) and evaluates all
              OCL invariants against the current snapshot.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Visual Badges &amp; Results Panel</strong>
            <p>
              Violations are highlighted directly on affected canvas nodes/edges and listed with
              actionable diagnostic descriptions in the bottom <em>Validation Results</em> panel.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="step-6">
        <h2 id="step-6">6. Iterate &amp; Refine</h2>
        <p>
          Use validation feedback to refine your system: adjust attribute values, fix missing links, or
          correct invariants and multiplicity bounds in the Class Diagram. Re-run validation to
          confirm that all constraints are satisfied.
        </p>
      </section>
    </DocLayout>
  );
}
