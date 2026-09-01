import { useEffect, useState } from 'react';

import {
  ApiClientError,
  modelCommandApi,
  type CommandElementReferenceDto,
  type DeleteImpactDto,
  type ProjectDto,
  type UmlInvariantDto,
} from '../../../api';
import { appStoreActions } from '../../../state';

interface InvariantDeleteDialogProps {
  project: ProjectDto;
  invariant: UmlInvariantDto;
  fallbackRevision: string;
  onCancel: () => void;
  onRefreshProject: () => Promise<boolean>;
}

export function InvariantDeleteDialog({
  project,
  invariant,
  fallbackRevision,
  onCancel,
  onRefreshProject,
}: InvariantDeleteDialogProps) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selectedCascades, setSelectedCascades] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    modelCommandApi.getDeleteImpact(project.project.id, 'INVARIANT', invariant.id)
      .then((result) => {
        if (active) setImpact(result);
      })
      .catch((caught) => {
        if (active) setError(commandError(caught));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [invariant.id, project.project.id]);

  const blockers = impact?.references.filter((reference) => !reference.cascadeAllowed) ?? [];
  const cascades = impact?.references.filter((reference) => reference.cascadeAllowed) ?? [];
  const allCascadesSelected = cascades.every((reference) => selectedCascades.includes(reference.referenceId));
  const canDelete = Boolean(impact) && blockers.length === 0 && allCascadesSelected && !isDeleting;
  const contextName = project.umlModel.classes.find((candidate) => candidate.id === invariant.contextClassId)?.qualifiedName
    ?? project.umlModel.classes.find((candidate) => candidate.id === invariant.contextClassId)?.name
    ?? invariant.contextClassId;

  async function removeInvariant() {
    if (!impact || !canDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const result = await modelCommandApi.deleteElement(
        project.project.id,
        'INVARIANT',
        invariant.id,
        {
          expectedRevision: impact.revision || fallbackRevision,
          cascadeReferenceIds: selectedCascades,
        },
      );
      setSuccess(`Invariant deleted at model revision ${result.revision}.`);
      if (!(await onRefreshProject())) {
        throw new Error('The invariant was deleted, but the authoritative project projection could not be reloaded.');
      }
      appStoreActions.removeElementReferences([invariant.id]);
      appStoreActions.markValidationStale();
      appStoreActions.select({ view: 'class-diagram', type: 'class', id: invariant.contextClassId });
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `Invariant ${contextName}::${invariant.name} deleted at model revision ${result.revision}.`,
      });
      onCancel();
    } catch (caught) {
      const currentImpact = impactFromError(caught);
      if (currentImpact) {
        setImpact(currentImpact);
        const allowed = new Set(currentImpact.references.filter((reference) => reference.cascadeAllowed).map((reference) => reference.referenceId));
        setSelectedCascades((current) => current.filter((referenceId) => allowed.has(referenceId)));
      }
      setSuccess(null);
      setError(commandError(caught));
      setIsDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-dialog invariant-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-invariant-title">
        <header className="modal-header">
          <div><h2 id="delete-invariant-title">Delete {contextName}::{invariant.name}?</h2><p>The current model revision is checked again when Delete is pressed.</p></div>
          <button type="button" className="icon-button" onClick={onCancel} disabled={isDeleting}>Close</button>
        </header>
        <div className="modal-body">
          <div className="delete-state delete-state-ready"><strong>This action removes the invariant.</strong><span>The context class and its objects remain unchanged.</span></div>
          <dl className="delete-target-identity">
            <dt>Context</dt><dd>{contextName}</dd>
            <dt>Invariant</dt><dd>{invariant.name}</dd>
            <dt>Expression</dt><dd><code>{invariant.expression}</code></dd>
          </dl>
          {isLoading ? <div className="delete-state delete-state-loading" role="status"><strong>Checking references...</strong><span>Loading delete impact and model revision.</span></div> : null}
          {impact && impact.references.length === 0 ? <p className="properties-message properties-message-success">No dependent references were found.</p> : null}
          {impact?.references.length ? <section className={`delete-reference-list ${blockers.length ? 'delete-reference-list-blocked' : ''}`}><h3>References</h3>{impact.references.map((reference) => <DeleteReference key={reference.referenceId} reference={reference} selected={selectedCascades.includes(reference.referenceId)} onChange={(checked) => setSelectedCascades((current) => checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} />)}</section> : null}
          {success ? <div className="delete-state delete-state-success" role="status"><strong>Invariant deleted</strong><span>{success}</span></div> : null}
          {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-footer"><button type="button" onClick={onCancel} disabled={isDeleting}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void removeInvariant()}>{isDeleting ? 'Deleting...' : 'Delete Invariant'}</button></footer>
      </section>
    </div>
  );
}

function DeleteReference({ reference, selected, onChange }: { reference: CommandElementReferenceDto; selected: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}><input type="checkbox" disabled={!reference.cascadeAllowed} checked={selected} onChange={(event) => onChange(event.target.checked)} /><span><strong>{reference.elementName}</strong><small>{reference.relation}{reference.path ? ` · ${reference.path}` : ''}{reference.cascadeAllowed ? ' · select to cascade' : ' · blocks deletion'}</small></span></label>;
}

function impactFromError(error: unknown): DeleteImpactDto | null {
  if (!(error instanceof ApiClientError)) return null;
  const candidate = error.dto.details?.impact ?? error.dto.details?.currentImpact;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const value = candidate as Partial<DeleteImpactDto>;
  return typeof value.revision === 'string' && Array.isArray(value.references) && value.target
    ? value as DeleteImpactDto
    : null;
}

function commandError(error: unknown) {
  if (error instanceof ApiClientError) return `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`;
  return error instanceof Error ? error.message : 'The invariant delete command failed.';
}
