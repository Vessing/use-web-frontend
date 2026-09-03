import { navigateTo } from '../../app/browserRouter';
import { DocLayout } from './DocLayout';

export function OperationInvocationPage() {
  return (
    <DocLayout activeRoute="object-diagram/operation-invocation">
      <h1 className="doc-page-title">Operation Invocation</h1>
      <p className="doc-page-lead">
        USE Web supports dynamic operation execution directly on runtime objects within a snapshot.
        This enables testing system behaviors, querying computed results, and verifying operation
        contracts (preconditions and postconditions) against live state transitions.
      </p>

      <section className="doc-section" aria-labelledby="invocation-overview">
        <h2 id="invocation-overview">Testing Behavior in Snapshots</h2>
        <p>
          In UML and OCL, operations are not merely static interface signatures; they specify state
          transitions and algorithmic computations. Through the <strong>Operation Invocation</strong> panel,
          you can execute operations on any runtime receiver object and observe the resulting snapshot:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Interactive Execution</strong>
            <p>
              Select any invokable operation available to the receiver object, including operations
              inherited from superclasses.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Contract Verification</strong>
            <p>
              Automatically evaluates defined OCL preconditions before execution and postconditions
              after execution.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>State Transition &amp; Rollback</strong>
            <p>
              Inspect the before/after snapshot diff. If a postcondition fails or an error occurs, the
              entire invocation is rolled back to protect snapshot consistency.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="invocation-workflow">
        <h2 id="invocation-workflow">Invocation Workflow</h2>
        <p>
          To invoke an operation on an object in the current snapshot:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            Select the target receiver object on the canvas or in the Model Explorer.
          </li>
          <li>
            In the Object Properties panel, switch to the <strong>Operations</strong> tab.
          </li>
          <li>
            Choose the desired operation from the dropdown list.
          </li>
          <li>
            Provide input argument values corresponding to each parameter's declared type.
          </li>
          <li>
            Click <strong>Invoke Operation</strong> to submit the execution command to the backend.
          </li>
        </ol>
      </section>

      <section className="doc-section" aria-labelledby="contract-lifecycle">
        <h2 id="contract-lifecycle">Contract Lifecycle &amp; OCL Keywords</h2>
        <p>
          When an operation has associated OCL contracts, execution follows a rigorous verification
          lifecycle:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>1. Precondition Gate (<code>pre:</code>)</strong>
            <p>
              Preconditions are evaluated against the pre-state snapshot. If any precondition evaluates
              to <code>false</code>, execution is blocked immediately and the violation is reported.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>2. Operation Body Execution (<code>body:</code>)</strong>
            <p>
              For query operations with an OCL <code>body:</code> expression, the return value is
              calculated dynamically. For mutators, slot updates are prepared.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>3. Postcondition Verification (<code>post:</code>)</strong>
            <p>
              Postconditions are evaluated comparing the post-state with the pre-state snapshot.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Contract Expressions (<code>result</code>, <code>@pre</code>)</strong>
            <p>
              Postconditions can reference the operation return value via <code>result</code>, previous
              slot values via <code>self.balance@pre</code>, and newly created objects via{' '}
              <code>obj.oclIsNew()</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="results-and-diagnostics">
        <h2 id="results-and-diagnostics">Reviewing Results &amp; Diagnostics</h2>
        <p>
          Upon execution, feedback is presented across multiple surfaces:
        </p>
        <ul style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            <strong>Operation Invocation Panel:</strong> Shows success notifications, returned values,
            and any direct parameter validation errors.
          </li>
          <li>
            <strong>Invocation Results Tab (Bottom Panel):</strong> Displays structured summaries of
            the invocation, including receiver object, operation name, evaluated arguments, before/after
            slot diffs, and contract outcomes.
          </li>
          <li>
            <strong>Canvas Updates:</strong> The receiver object's compartments and linked relationships
            instantly refresh with the new state values.
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
                href="/docs/object-diagram/objects"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/docs/object-diagram/objects');
                }}
              >
                Objects &rarr;
              </a>
            </strong>
            <p>
              Learn how to instantiate classes, edit slots, and configure complex structured values.
            </p>
          </div>

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
              Learn how to establish relationships between objects, configure qualifiers, and model
              association classes.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
