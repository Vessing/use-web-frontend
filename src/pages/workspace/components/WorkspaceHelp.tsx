import { useEffect, useRef, useState } from 'react';

import type { WorkspaceView } from '../../../app/navigation';

const helpByView: Record<WorkspaceView, { title: string; sections: Array<{ label: string; text: string }> }> = {
  'class-diagram': {
    title: 'Class Diagram help',
    sections: [
      { label: 'Model', text: 'Create model elements from the canvas toolbar, then select them in the Explorer or canvas.' },
      { label: 'Edit', text: 'The Properties panel edits the current selection. Advanced UML details remain grouped by topic.' },
      { label: 'Results', text: 'Diagnostics and constraint results open the referenced model element or OCL source.' },
    ],
  },
  'object-diagram': {
    title: 'Object Diagram help',
    sections: [
      { label: 'Snapshot', text: 'Create objects and links from the canvas toolbar, then select an instance in the Explorer or canvas.' },
      { label: 'Edit', text: 'Object Properties edits stored values, associations and executable operations for the selection.' },
      { label: 'Results', text: 'Constraint and invocation results keep their snapshot revision and navigate to affected instances.' },
    ],
  },
  ocl: {
    title: 'OCL Editor help',
    sections: [
      { label: 'Source', text: 'Edit the project model text and apply the complete draft to compile it on the backend.' },
      { label: 'Profile', text: 'OCL Profile shows the supported language features and configured runtime limits.' },
      { label: 'Results', text: 'Diagnostics and validation results retain source locations and navigate back to the editor.' },
    ],
  },
};

export function WorkspaceHelp({ activeView }: { activeView: WorkspaceView }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const content = helpByView[activeView];

  const close = () => {
    triggerRef.current?.focus();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button workspace-help-trigger"
        aria-label={`Open ${content.title}`}
        aria-haspopup="dialog"
        title={content.title}
        onClick={() => setIsOpen(true)}
      >
        ?
      </button>
      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <div
            ref={dialogRef}
            className="modal-dialog workspace-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-help-title"
          >
            <header className="modal-header">
              <h2 id="workspace-help-title">{content.title}</h2>
              <button type="button" className="icon-button" aria-label="Close help" title="Close help" onClick={close}>×</button>
            </header>
            <div className="modal-body workspace-help-body">
              {content.sections.map((section) => (
                <section key={section.label}>
                  <h3>{section.label}</h3>
                  <p>{section.text}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
