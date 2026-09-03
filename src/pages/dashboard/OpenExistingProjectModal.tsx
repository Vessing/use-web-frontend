import { useRef, useState } from 'react';

import type { ApplyModelTextResponseDto, OclDiagnosticDto } from '../../api';

interface OpenExistingProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportUseFile: (
    file: File,
    modelText: string,
    sourceFiles: Record<string, string>,
  ) => Promise<ApplyModelTextResponseDto>;
}

interface SelectedUseFile {
  file: File;
  modelText: string;
}

export function OpenExistingProjectModal({
  isOpen,
  onClose,
  onImportUseFile,
}: OpenExistingProjectModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dependencyInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedUseFile | null>(null);
  const [dependencyFiles, setDependencyFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<OclDiagnosticDto[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSelectFile = async (file: File | undefined) => {
    setDiagnostics([]);
    setFormError(null);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.use')) {
      setSelectedFile(null);
      setFormError('Only .use files can be opened in this flow.');
      return;
    }

    try {
      const modelText = await file.text();
      setSelectedFile({ file, modelText });
      setDependencyFiles([]);
    } catch {
      setSelectedFile(null);
      setFormError('The selected file could not be read.');
    }
  };

  const handleSelectDependencies = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.some((file) => !file.name.toLowerCase().endsWith('.use'))) {
      setFormError('Only .use files can be added as imported sources.');
      return;
    }
    setFormError(null);
    setDependencyFiles((current) => [
      ...current,
      ...selectedFiles.filter(
        (file) => !current.some((currentFile) => sourceFilePath(currentFile) === sourceFilePath(file)),
      ),
    ]);
  };

  const handleOpenProject = async () => {
    if (!selectedFile) {
      setFormError('Select a .use file first.');
      return;
    }

    setIsImporting(true);
    setFormError(null);
    setDiagnostics([]);

    try {
      const sourceFiles = Object.fromEntries(
        await Promise.all(
          dependencyFiles.map(async (file) => [
            sourceFilePath(file),
            await file.text(),
          ]),
        ),
      );
      const response = await onImportUseFile(selectedFile.file, selectedFile.modelText, sourceFiles);
      setDiagnostics(response.diagnostics ?? []);

      if (!response.success) {
        setFormError('The file was read, but the backend could not apply the supported model text.');
      }
    } catch {
      setFormError('The .use file could not be sent to the backend.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-dialog open-existing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-existing-modal-title"
      >
        <header className="modal-header">
          <h2 id="open-existing-modal-title">Open Existing Project</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>
        <div className="modal-body">
          <div className="open-existing-tabs" aria-label="Open Existing source">
            <button type="button" className="open-existing-tab open-existing-tab-active">
              Local File
            </button>
          </div>
          <button
            type="button"
            className="file-drop-zone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleSelectFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="file-drop-icon" aria-hidden="true" />
            <span className="file-drop-title">
              {selectedFile ? selectedFile.file.name : 'Drop your .use file here'}
            </span>
            <span className="file-drop-subtitle">
              {selectedFile
                ? `${formatFileSize(selectedFile.file.size)} ready to open`
                : 'or browse from your computer'}
            </span>
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".use"
            aria-label="Choose .use file"
            onChange={(event) => {
              void handleSelectFile(event.currentTarget.files?.[0]);
            }}
          />
          <button type="button" onClick={() => dependencyInputRef.current?.click()}>
            Add imported .use files
          </button>
          <input
            ref={dependencyInputRef}
            className="visually-hidden"
            type="file"
            accept=".use"
            multiple
            aria-label="Choose imported .use files"
            onChange={(event) => {
              handleSelectDependencies(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
          <p className="modal-empty">
            {dependencyFiles.length
              ? `${dependencyFiles.length} imported source file${dependencyFiles.length === 1 ? '' : 's'} included.`
              : 'Add every .use file referenced by imports.'}
          </p>
          {dependencyFiles.length ? (
            <ul className="import-source-files" aria-label="Included imported source files">
              {dependencyFiles.map((file) => (
                <li key={sourceFilePath(file)}>
                  <span>
                    <strong>{sourceFilePath(file)}</strong>
                    <small>{formatFileSize(file.size)}</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove imported file ${sourceFilePath(file)}`}
                    onClick={() => setDependencyFiles((current) =>
                      current.filter((currentFile) => sourceFilePath(currentFile) !== sourceFilePath(file)),
                    )}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {formError ? (
            <p className="modal-form-error" role="alert">
              {formError}
            </p>
          ) : null}
          {diagnostics.length > 0 ? (
            <section className="import-diagnostics" aria-label="Import diagnostics">
              <h3>Diagnostics</h3>
              <ul>
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${index}`}>
                    <strong>{diagnostic.severity}</strong> {diagnostic.code}: {diagnostic.userMessage ?? diagnostic.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isImporting || selectedFile === null}
            onClick={handleOpenProject}
          >
            {isImporting ? 'Opening...' : 'Open Project'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function sourceFilePath(file: File) {
  return file.webkitRelativePath || file.name;
}
