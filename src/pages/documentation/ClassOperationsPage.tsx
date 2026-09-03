import { DocLayout } from './DocLayout';

export function ClassOperationsPage() {
  return (
    <DocLayout activeRoute="class-diagram/properties/operations">
      <h1 className="doc-page-title">Class Properties: Operations</h1>
      <p className="doc-page-lead">
        Operations define the behavior, inquiry contracts, and callable methods of a Class. In USE,
        operations feature full signature specifications, ordered parameters, OCL query bodies,
        and formal pre- and post-condition contracts.
      </p>

      <section className="doc-section" aria-labelledby="operations-overview">
        <h2 id="operations-overview">Overview &amp; Navigation</h2>
        <p>
          Select a class on the canvas and open the <strong>Operations</strong> tab in the Class
          Properties panel. From here, you can switch between existing operations or click{' '}
          <strong>Add Operation</strong>. The panel is organized into four inner tabs:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>1. Signature</strong>
            <p>
              Configure operation name, return type (including <code>Void</code>), visibility,
              modifiers (Static, Query, Abstract), and ordered parameter lists.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>2. Preconditions</strong>
            <p>
              Define conditions that must hold true before the operation can be invoked.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>3. Postconditions</strong>
            <p>
              Specify guarantees and state changes that must be satisfied upon operation completion.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>4. Body (OCL Query)</strong>
            <p>
              Supply an OCL expression body for side-effect-free query operations.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="signature-tab">
        <h2 id="signature-tab">Signature &amp; Parameter Configuration</h2>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Name &amp; Return Type</strong>
            <p>
              Operation names follow lowerCamelCase (e.g. <code>deposit</code>,{' '}
              <code>calculateTotal</code>). Return types are selected using the TypePicker or set
              to <code>Void</code> for mutator operations.
            </p>
          </div>

          <div className="doc-feature-card">
            <strong>Operation Flags</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>
                <strong>Static:</strong> Classifier-level operation invoked on the class itself
                rather than an instance.
              </li>
              <li>
                <strong>Query:</strong> Declares the operation as side-effect-free, enabling an OCL
                query body.
              </li>
              <li>
                <strong>Abstract:</strong> Operation signature without implementation, requiring
                concrete subclasses to provide a body.
              </li>
            </ul>
          </div>

          <div className="doc-feature-card">
            <strong>Ordered Parameters</strong>
            <p>
              Add parameters with custom names and types. Each parameter specifies a{' '}
              <strong>Direction</strong>: <code>in</code> (input value), <code>out</code> (output
              result), or <code>inout</code> (modified in place). Parameters can be reordered
              sequentially using the <strong>Up</strong> and <strong>Down</strong> buttons to
              match your intended signature.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="contracts-tab">
        <h2 id="contracts-tab">Operation Contracts: Pre &amp; Post Conditions</h2>
        <p>
          USE supports Design by Contract via OCL contracts:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Preconditions (<code>pre</code>)</strong>
            <p>
              Ensure valid input parameters and system state prior to execution. For example:
            </p>
            <pre style={{ margin: '8px 0', padding: '10px', background: '#1e293b', color: '#f8fafc', borderRadius: '6px' }}>
              <code>context Account::withdraw(amount : Real){'\n'}pre PositiveAmount: amount &gt; 0{'\n'}pre SufficientFunds: self.balance &gt;= amount</code>
            </pre>
          </div>

          <div className="doc-feature-card">
            <strong>Postconditions (<code>post</code>)</strong>
            <p>
              Verify that the operation produced the intended state changes. The <code>@pre</code>{' '}
              suffix references attribute values from before the operation was invoked:
            </p>
            <pre style={{ margin: '8px 0', padding: '10px', background: '#1e293b', color: '#f8fafc', borderRadius: '6px' }}>
              <code>context Account::withdraw(amount : Real){'\n'}post BalanceDeducted: self.balance = self.balance@pre - amount</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="body-tab">
        <h2 id="body-tab">OCL Query Body</h2>
        <p>
          When an operation is marked as a non-abstract <strong>Query</strong>, the <em>Body</em>{' '}
          tab unlocks an OCL editor where you write the calculation expression. The expression has
          access to <code>self</code> and all declared input parameters, returning a result that
          matches the operation's return type.
        </p>
        <p>
          In the <strong>Object Diagram</strong>, query operations can be invoked interactively on
          instances, allowing you to test calculations directly against runtime snapshot data.
        </p>
      </section>
    </DocLayout>
  );
}
