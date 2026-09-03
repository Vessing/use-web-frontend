import { DocLayout } from './DocLayout';

export function ImportsPage() {
  return (
    <DocLayout activeRoute="imports">
      <h1 className="doc-page-title">Project Imports</h1>
      <p className="doc-page-lead">
        Imports allow you to modularize large specifications into reusable <code>.use</code> models,
        share common classifiers across projects, and establish clear architectural boundaries.
      </p>

      <section className="doc-section" aria-labelledby="imports-overview">
        <h2 id="imports-overview">Overview &amp; Purpose</h2>
        <p>
          Instead of defining all classes, types, and associations in a single monolithic model, USE
          supports importing external model files. When a model is imported, its classifiers become
          available for referencing throughout your project.
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Reusability</strong>
            <p>
              Define common data models (such as shared core entities, units, or base types) once
              and reuse them across multiple domain models.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Namespace Separation</strong>
            <p>
              Each imported model is anchored to a distinct namespace (e.g.{' '}
              <code>shared::core</code>) and can optionally be given a short alias for concise
              referencing.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Read-Only Protection</strong>
            <p>
              Imported classifiers are strictly read-only within the importing project, ensuring
              upstream dependencies cannot be inadvertently altered.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="adding-imports">
        <h2 id="adding-imports">Adding an Import</h2>
        <p>
          To add an external model dependency to your current project:
        </p>
        <ol style={{ paddingLeft: '24px', color: '#475569', lineHeight: 1.8 }}>
          <li>
            In the <strong>Model Explorer</strong>, locate the <em>Imports</em> section and click the{' '}
            <strong>+</strong> (Add Import) button.
          </li>
          <li>
            Select or drag-and-drop the target <code>.use</code> source file.
          </li>

        </ol>
      </section>

      <section className="doc-section" aria-labelledby="using-imported-elements">
        <h2 id="using-imported-elements">Using Imported Elements</h2>
        <p>
          Once resolved, imported elements can be referenced just like local classifiers:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Attribute &amp; Parameter Types</strong>
            <p>
              Assign imported classes, enumerations, or datatypes as the type of an attribute or
              operation parameter (e.g. <code>studentId : shared::core::Identifier</code>).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Generalizations (Inheritance)</strong>
            <p>
              Extend imported classes by declaring them as supertypes of your local classes (e.g.{' '}
              <code>Student extends shared::core::NamedElement</code>).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Association Ends</strong>
            <p>
              Connect local classes to imported classes with binary or n-ary associations.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>OCL Invariants &amp; Expressions</strong>
            <p>
              Navigate across imported associations and access public attributes in your invariant
              constraints using qualified names.
            </p>
          </div>
        </div>
      </section>

      <section className="doc-section" aria-labelledby="import-diagnostics">
        <h2 id="import-diagnostics">Validation &amp; Diagnostics</h2>
        <p>
          The system continuously validates import dependencies and surfaces diagnostics in the{' '}
          <em>Validation Results</em> panel:
        </p>
        <div className="doc-feature-cards">
          <div className="doc-feature-card">
            <strong>Import Cycles (<code>IMPORT_CYCLE</code>)</strong>
            <p>
              Circular dependencies (e.g. Model A &rarr; Model B &rarr; Model A) are detected and
              flagged as blocking errors before models can be evaluated.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Ambiguous Names (<code>AMBIGUOUS_NAME</code>)</strong>
            <p>
              If two imports export classifiers with the same name, the validator requires using an
              explicit fully qualified name (e.g. <code>shared::core::Money</code> vs.{' '}
              <code>finance::Money</code>).
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Unknown Namespace (<code>UNKNOWN_NAMESPACE</code>)</strong>
            <p>
              Raised when an OCL expression or type reference targets an import or namespace that is
              missing or unresolvable.
            </p>
          </div>
          <div className="doc-feature-card">
            <strong>Visibility Violations (<code>INACCESSIBLE_PROPERTY</code>)</strong>
            <p>
              Private or protected features of imported classifiers cannot be directly accessed
              from outside their defining package.
            </p>
          </div>
        </div>
      </section>
    </DocLayout>
  );
}
