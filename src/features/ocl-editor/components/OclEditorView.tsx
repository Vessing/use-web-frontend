import { useEffect, useRef, useState } from 'react';

import {
  projectApi,
  type ApplyModelTextResponseDto,
  type OclDiagnosticDto,
  type ProjectDto,
} from '../../../api';
import { getEditableModelText, renderUseModelText } from '../modelText';

interface OclEditorViewProps {
  projectId: string;
  project: ProjectDto | null;
  isLoading: boolean;
  error: string | null;
  onProjectChange: (project: ProjectDto) => void;
  applyModelText?: typeof projectApi.applyModelText;
}

export function OclEditorView({
  projectId,
  project,
  isLoading,
  error,
  onProjectChange,
  applyModelText = projectApi.applyModelText,
}: OclEditorViewProps) {
  const [modelText, setModelText] = useState('');
  const [diagnostics, setDiagnostics] = useState<OclDiagnosticDto[]>([]);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const loadedProjectIdRef = useRef<string | null>(null);
  const modelSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const nextProjectId = project?.project.id ?? null;

    if (loadedProjectIdRef.current === nextProjectId) {
      const nextSignature = project ? projectModelSignature(project) : null;
      if (!isDirty && modelSignatureRef.current !== nextSignature) {
        modelSignatureRef.current = nextSignature;
        setModelText(project ? renderUseModelText(project) : '');
        setDiagnostics([]);
        setApplyError(null);
        setApplySuccess(null);
        setConsoleLines((currentLines) => [
          ...currentLines,
          project ? `Updated model text from ${project.project.name}.` : 'Cleared model text.',
        ]);
      }
      return;
    }

    loadedProjectIdRef.current = nextProjectId;
    modelSignatureRef.current = project ? projectModelSignature(project) : null;
    setModelText(project ? getEditableModelText(project) : '');
    setDiagnostics([]);
    setApplyError(null);
    setApplySuccess(null);
    setIsDirty(false);
    setConsoleLines(project ? [`Loaded model text for ${project.project.name}.`] : []);
  }, [project]);

  if (isLoading) {
    return (
      <section className="canvas-placeholder" aria-label="OCL Editor Loading">
        <h2>OCL Editor</h2>
        <p>Loading model text...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="canvas-placeholder" aria-label="OCL Editor Error">
        <h2>OCL Editor</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="canvas-placeholder" aria-label="OCL Editor Empty">
        <h2>OCL Editor</h2>
        <p>Open or create a project before editing USE model text.</p>
      </section>
    );
  }

  const activeProject = project;
  const lineNumbers = modelText.split('\n').map((_, index) => index + 1);
  const sourceName =
    activeProject.modelText?.sourceName ?? `${activeProject.project.name || 'model'}.use`;

  async function handleApply() {
    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const response: ApplyModelTextResponseDto = await applyModelText(projectId, {
        modelText,
        format: 'USE_MODEL_TEXT',
        mode: 'REPLACE_UML_MODEL',
        includeDiagnostics: true,
        sourceName,
        sourceFormat: 'use',
        sourceOrigin: 'ocl-editor',
        baseVersion: activeProject.modelText?.version ?? null,
      });

      setDiagnostics(response.diagnostics);
      onProjectChange(response.project);
      modelSignatureRef.current = projectModelSignature(response.project);

      if (response.modelText?.modelText) {
        setModelText(response.modelText.modelText);
      }

      setIsDirty(response.status === 'NOT_APPLIED');
      setApplySuccess(formatApplySuccessLine(response));
      setConsoleLines((currentLines) => [
        ...currentLines,
        formatApplyConsoleLine(response),
      ]);
    } catch {
      setApplyError('Model text could not be applied. Check backend availability and diagnostics.');
      setApplySuccess(null);
      setConsoleLines((currentLines) => [
        ...currentLines,
        'Apply failed: backend request did not complete.',
      ]);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="ocl-editor-view" aria-label="OCL Editor">
      <div className="ocl-editor-toolbar">
        <div>
          <h2>Model Text</h2>
          <p>
            Edit USE-style model text for classes, associations, invariants, and OCL expressions.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={handleApply}
          disabled={isApplying || modelText.trim().length === 0 || !isDirty}
        >
          {isApplying ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>

      {applyError ? (
        <div className="ocl-editor-error" role="alert">
          {applyError}
        </div>
      ) : null}

      {applySuccess ? (
        <div className="ocl-editor-success" role="status">
          {applySuccess}
        </div>
      ) : null}

      <div className="ocl-editor-shell">
        <div className="ocl-editor-gutter" aria-hidden="true">
          {lineNumbers.map((lineNumber) => (
            <span key={lineNumber}>{lineNumber}</span>
          ))}
        </div>
        <textarea
          aria-label="USE model text"
          className="ocl-editor-textarea"
          value={modelText}
          spellCheck={false}
          onChange={(event) => {
            setModelText(event.target.value);
            setIsDirty(true);
            setApplySuccess(null);
          }}
        />
      </div>

      <div className="ocl-editor-meta-grid">
        <section className="ocl-editor-panel" aria-label="OCL Diagnostics">
          <h3>Diagnostics</h3>
          {diagnostics.length === 0 ? (
            <p>No diagnostics returned.</p>
          ) : (
            <ul>
              {diagnostics.map((diagnostic, index) => (
                <li key={diagnostic.id ?? `${diagnostic.code}-${index}`}>
                  <strong>{diagnostic.severity}</strong> {diagnostic.code}: {diagnostic.message}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ocl-editor-panel" aria-label="OCL Console">
          <h3>Console</h3>
          <ul>
            {consoleLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function projectModelSignature(project: ProjectDto) {
  return JSON.stringify({
    name: project.project.name,
    umlModel: project.umlModel,
  });
}

function formatApplyConsoleLine(response: ApplyModelTextResponseDto): string {
  const diagnosticCount = response.diagnostics.length;
  const changedCount = response.changedElementIds.length;

  return `Apply ${response.status}: ${changedCount} changed element(s), ${diagnosticCount} diagnostic(s).`;
}

function formatApplySuccessLine(response: ApplyModelTextResponseDto): string | null {
  if (response.status === 'NOT_APPLIED' || !response.success) {
    return null;
  }

  const diagnosticCount = response.diagnostics.length;
  const changedCount = response.changedElementIds.length;

  if (response.status === 'APPLIED_WITH_WARNINGS' || diagnosticCount > 0) {
    return `Changes applied with ${diagnosticCount} diagnostic(s). ${changedCount} model element(s) updated.`;
  }

  return `Changes applied. ${changedCount} model element(s) updated.`;
}
