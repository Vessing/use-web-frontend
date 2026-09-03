import { useRef, useState } from 'react';

import { projectApi, type OclDiagnosticDto, type ProjectDto } from '../../../api';
import { appStoreActions } from '../../../state';

interface AddSourceImportModalProps {
  project: ProjectDto;
  onRefreshProject: () => Promise<boolean>;
}

export function AddSourceImportModal({ project, onRefreshProject }: AddSourceImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>(() =>
    Object.fromEntries((project.modelText?.sourceFiles ?? []).map((source) => [source.sourcePath, source.text])),
  );
  const [rootText, setRootText] = useState(() => project.modelText?.modelText ?? '');
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<OclDiagnosticDto[]>([]);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList | null) => {
    const additions = Array.from(files ?? []);
    if (additions.some((file) => !file.name.toLocaleLowerCase().endsWith('.use'))) {
      setError('Only .use files can be added as imported sources.');
      return;
    }
    try {
      const entries = await Promise.all(additions.map(async (file) => [sourceFilePath(file), await file.text()] as const));
      setSourceFiles((current) => ({ ...current, ...Object.fromEntries(entries) }));
      setRootText((current) => addImportStatements(current, entries.map(([path]) => path)));
      setError(null);
    } catch {
      setError('The selected source file could not be read.');
    }
  };

  const removeFile = (sourcePath: string) => {
    setSourceFiles((current) => {

      const { [sourcePath]: _removed, ...remaining } = current;
      return remaining;
    });
    setRootText((current) => removeImportStatement(current, sourcePath));
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDiagnostics([]);
    try {
      const response = await projectApi.applyModelText(project.project.id, {
        modelText: rootText,
        format: 'USE_MODEL_TEXT',
        mode: 'REPLACE_UML_MODEL',
        includeDiagnostics: true,
        sourceName: project.modelText?.sourceName ?? `${project.project.name || 'model'}.use`,
        sourceFormat: 'use',
        sourceOrigin: 'explorer-import',
        baseVersion: project.modelText?.version ?? null,
        sourceFiles,
        replaceSourceFiles: true,
      });
      setDiagnostics(response.diagnostics ?? []);
      if (!(await onRefreshProject())) {
        throw new Error('The authoritative project projection could not be reloaded.');
      }
      if (!response.success) {
        setError('The source files were saved, but the backend could not apply the model text.');
        return;
      }
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `${Object.keys(sourceFiles).length} imported source file(s) configured.`,
      });
      appStoreActions.closeModal();
    } catch {
      setError('The imported source files could not be applied.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="add-source-import-title">
        <header className="modal-header">
          <h2 id="add-source-import-title">Add Imported Source Files</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={() => appStoreActions.closeModal()}>x</button>
        </header>
        <div className="modal-body">
          <p className="modal-hint">Every selected file is imported into this project with <code>import * from "filename.use"</code>.</p>
          <button type="button" onClick={() => inputRef.current?.click()}>Choose .use files</button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".use"
            multiple
            aria-label="Choose imported source files"
            onChange={(event) => {
              void addFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
          {Object.keys(sourceFiles).length ? (
            <ul className="import-source-files" aria-label="Imported source files">
              {Object.keys(sourceFiles).sort().map((sourcePath) => (
                <li key={sourcePath}>
                  <strong>{sourcePath}</strong>
                  <button type="button" aria-label={`Remove imported file ${sourcePath}`} onClick={() => removeFile(sourcePath)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : <p className="modal-empty">No imported source files.</p>}
          {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
          {diagnostics.length ? (
            <section className="import-diagnostics" aria-label="Import diagnostics">
              <h3>Diagnostics</h3>
              <ul>{diagnostics.map((diagnostic, index) => <li key={`${diagnostic.code}-${index}`}><strong>{diagnostic.severity}</strong> {diagnostic.code}: {diagnostic.userMessage ?? diagnostic.message}</li>)}</ul>
            </section>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={() => appStoreActions.closeModal()}>Cancel</button>
          <button type="button" className="primary-button" disabled={busy} onClick={() => void submit()}>{busy ? 'Applying...' : 'Apply Imports'}</button>
        </footer>
      </section>
    </div>
  );
}

function sourceFilePath(file: File) {
  return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}

function addImportStatements(text: string, paths: string[]) {
  const additions = paths.filter((path) => !hasAllElementsImport(text, path))
    .map((path) => `import * from "${path}"`);
  return additions.length ? `${additions.join('\n')}\n${text}` : text;
}

function removeImportStatement(text: string, sourcePath: string) {
  const escapedPath = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`^\\s*import\\b[^\\r\\n]*\\bfrom\\s+"${escapedPath}"\\s*\\r?\\n`, 'gmi'), '');
}

function hasAllElementsImport(text: string, sourcePath: string) {
  const escapedPath = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*import\\s+\\*\\s+from\\s+"${escapedPath}"\\s*$`, 'mi').test(text);
}
