import { useEffect, useMemo, useState } from 'react';
import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto, UmlInvariantDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { PropertySection, PropertyTextField } from './ClassPropertiesPanel';
import { InvariantDeleteDialog } from './InvariantDeleteDialog';

interface InvariantPropertiesPanelProps {
  project: ProjectDto;
  invariant: UmlInvariantDto;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
}

export function InvariantPropertiesPanel({
  project,
  invariant,
  readVersion,
  onRefreshProject,
}: InvariantPropertiesPanelProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [draft, setDraft] = useState(invariant);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmContextChange, setConfirmContextChange] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(invariant), [draft, invariant]);

  useEffect(() => {
    setDraft(invariant);
  }, [invariant]);

  useEffect(() => {
    setNotice(null);
    setFieldErrors({});
  }, [invariant.id]);

  const save = async () => {
    if (!dirty || isSaving || !readVersion || !draft.name.trim() || !draft.expression.trim()) return;
    if (draft.contextClassId !== invariant.contextClassId && !confirmContextChange) {
      setConfirmContextChange(true);
      return;
    }
    setConfirmContextChange(false);
    setIsSaving(true);
    setNotice(null);
    setFieldErrors({});
    try {
      const result = await modelCommandApi.updateInvariant(project.project.id, invariant.id, {
        expectedRevision: readVersion,
        draft,
      });
      if (!(await onRefreshProject())) {
        throw new Error('The authoritative invariant projection could not be reloaded.');
      }
      const text = `Invariant "${result.result.name}" saved at model revision ${result.revision}.`;
      setNotice({ error: false, text });
      appStoreActions.markValidationStale();
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: text });
    } catch (error) {
      if (error instanceof ApiClientError) setFieldErrors(error.dto.fieldErrors ?? {});
      setNotice({ error: true, text: commandMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="properties-content" aria-busy={isSaving}>
      <h3>Invariant Properties</h3>
      <PropertyTextField label="Invariant ID" value={invariant.id} readOnly />
      <PropertyTextField
        label="Invariant Name"
        value={draft.name}
        error={!draft.name.trim() ? 'Invariant name is required.' : fieldErrors.name ?? null}
        onChange={(name) => setDraft((current) => ({ ...current, name }))}
      />
      <button type="button" className="danger-button" onClick={() => setShowDelete(true)}>Delete Invariant</button>
      <label className="property-field">
        <span>Context Class</span>
        <select
          value={draft.contextClassId}
          aria-invalid={Boolean(fieldErrors.contextClassId) || undefined}
          onChange={(event) => setDraft((current) => ({ ...current, contextClassId: event.target.value }))}
        >
          {project.umlModel.classes.map((umlClass) => (
            <option key={umlClass.id} value={umlClass.id}>
              {umlClass.name}
            </option>
          ))}
        </select>
        {fieldErrors.contextClassId ? <small className="property-field-error" role="alert">{fieldErrors.contextClassId}</small> : null}
      </label>

      <PropertySection title="OCL Expression">
        <label className="property-field">
          <span>Expression</span>
          <textarea
            value={draft.expression}
            rows={5}
            aria-invalid={!draft.expression.trim() || Boolean(fieldErrors.expression) || undefined}
            onChange={(event) => setDraft((current) => ({ ...current, expression: event.target.value }))}
          />
          {!draft.expression.trim() ? <small className="property-field-error">OCL expression is required.</small> : null}
          {draft.expression.trim() && fieldErrors.expression ? <small className="property-field-error" role="alert">{fieldErrors.expression}</small> : null}
        </label>
      </PropertySection>
      {notice ? <p className={`properties-message properties-message-${notice.error ? 'error' : 'success'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</p> : null}
      <footer className="properties-actions">
        <button type="button" disabled={!dirty || isSaving} onClick={() => { setDraft(invariant); setNotice(null); setFieldErrors({}); }}>Discard</button>
        <button type="button" className="primary-button" disabled={!dirty || isSaving || !readVersion || !draft.name.trim() || !draft.expression.trim()} onClick={() => void save()}>{isSaving ? 'Applying...' : 'Apply Changes'}</button>
      </footer>
      {confirmContextChange ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="invariant-context-title">
            <h3 id="invariant-context-title">Change invariant context?</h3>
            <p>The backend will revalidate the OCL expression against the selected context class.</p>
            <div className="modal-actions"><button type="button" onClick={() => setConfirmContextChange(false)}>Cancel</button><button type="button" className="primary-button" onClick={() => void save()}>Change Context and Save</button></div>
          </div>
        </div>
      ) : null}
      {showDelete ? <InvariantDeleteDialog project={project} invariant={invariant} fallbackRevision={readVersion} onCancel={() => setShowDelete(false)} onRefreshProject={onRefreshProject} /> : null}
    </div>
  );
}

function commandMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    const revision = error.dto.details?.currentRevision;
    return `${error.dto.userMessage ?? error.dto.message}${typeof revision === 'string' ? ` Current model revision: ${revision}.` : ''}`;
  }
  return error instanceof Error ? error.message : 'The invariant could not be saved.';
}
