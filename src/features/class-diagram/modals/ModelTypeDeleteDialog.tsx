import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ApiClientError,
  modelCommandApi,
  type CommandElementReferenceDto,
  type DeleteImpactDto,
  type ProjectDto,
} from '../../../api';
import { appStoreActions, type ModalState, type SelectionState } from '../../../state';

type DeleteModal = Extract<Exclude<ModalState, null>, { type: 'deleteModelTypeElement' }>;

interface ModelTypeDeleteDialogProps {
  modal: DeleteModal;
  project: ProjectDto;
  fallbackRevision: string;
  onRefreshProject: () => Promise<boolean>;
}

export function ModelTypeDeleteDialog({
  modal,
  project,
  fallbackRevision,
  onRefreshProject,
}: ModelTypeDeleteDialogProps) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selectedCascades, setSelectedCascades] = useState<string[]>([]);
  const [busy, setBusy] = useState<'impact' | 'delete' | null>('impact');
  const [error, setError] = useState<string | null>(null);
  const [successRevision, setSuccessRevision] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const copy = useMemo(() => targetCopy(modal), [modal]);

  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && busy !== 'delete') appStoreActions.closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy]);

  useEffect(() => {
    let active = true;
    setBusy('impact');
    setError(null);
    void loadImpact(project.project.id, modal)
      .then((value) => {
        if (!active) return;
        setImpact(value);
        setSelectedCascades([]);
      })
      .catch((caught) => {
        if (active) setError(deleteError(caught));
      })
      .finally(() => {
        if (active) setBusy(null);
      });
    return () => {
      active = false;
    };
  }, [modal, project.project.id]);

  const blockers = impact?.references.filter((reference) => !reference.cascadeAllowed) ?? [];
  const cascades = impact?.references.filter((reference) => reference.cascadeAllowed) ?? [];
  const allCascadesSelected = cascades.every((reference) =>
    selectedCascades.includes(reference.referenceId),
  );
  const canDelete = Boolean(impact) && blockers.length === 0 && allCascadesSelected && !busy;

  const remove = async () => {
    if (!impact || !canDelete) return;
    setBusy('delete');
    setError(null);
    try {
      const request = {
        expectedRevision: impact.revision || fallbackRevision,
        cascadeReferenceIds: selectedCascades,
        ...(modal.targetKind === 'ENUMERATION_LITERAL'
          ? { enumerationId: modal.ownerId }
          : {}),
      };
      const result = modal.targetKind === 'DATATYPE_PROPERTY'
        ? await modelCommandApi.deleteDataTypeProperty(
            project.project.id,
            modal.ownerId!,
            modal.elementId,
            request,
          )
        : await modelCommandApi.deleteElement(
            project.project.id,
            modal.targetKind,
            modal.elementId,
            request,
          );
      if (!(await onRefreshProject())) {
        throw new Error(`${copy.subject} was deleted, but the authoritative projection could not be reloaded.`);
      }
      if (modal.targetKind === 'ENUMERATION' || modal.targetKind === 'DATATYPE') {
        appStoreActions.clearSelection();
      }
      appStoreActions.markValidationStale();
      appStoreActions.addConsoleLog({
        level: 'info',
        source: 'api',
        message: `${copy.subject} ${modal.elementName} deleted at model revision ${result.revision}.`,
      });
      setSuccessRevision(result.revision);
    } catch (caught) {
      let current = impactFromError(caught);
      if (!current && caught instanceof ApiClientError && caught.dto.code === 'STALE_MODEL_REVISION') {
        try {
          current = await loadImpact(project.project.id, modal);
        } catch {
          // Keep the rejected draft and original conflict when the refresh also fails.
        }
      }
      if (current) {
        setImpact(current);
        const allowed = new Set(
          current.references
            .filter((reference) => reference.cascadeAllowed)
            .map((reference) => reference.referenceId),
        );
        setSelectedCascades((ids) => ids.filter((id) => allowed.has(id)));
      }
      setError(deleteError(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-dialog model-type-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-type-delete-title"
        aria-busy={Boolean(busy)}
      >
        <header className="modal-header">
          <div>
            <h2 id="model-type-delete-title">Delete {copy.subject}?</h2>
            <p>{copy.description}</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="icon-button"
            aria-label="Close delete dialog"
            disabled={busy === 'delete'}
            onClick={() => appStoreActions.closeModal()}
          >
            Close
          </button>
        </header>
        <div className="modal-body">
          {successRevision ? (
            <div className="delete-state delete-state-success" role="status">
              <strong>{copy.subject} deleted</strong>
              <span>
                The workspace and type catalog were reloaded at model revision {successRevision}.
              </span>
            </div>
          ) : null}
          {!successRevision && busy === 'impact' ? (
            <div className="delete-state delete-state-loading" role="status">
              <strong>Checking references...</strong>
              <span>The current model revision and authoritative delete impact are loading.</span>
            </div>
          ) : null}
          {!successRevision && impact ? (
            <>
              <dl className="delete-target-identity">
                {modal.ownerName ? <><dt>Owner</dt><dd>{modal.ownerName}</dd></> : null}
                <dt>{copy.subject}</dt><dd>{modal.elementName}</dd>
                {modal.position && modal.total ? <><dt>Position</dt><dd>{modal.position} of {modal.total}</dd></> : null}
                <dt>Revision</dt><dd>Model revision {impact.revision}</dd>
              </dl>
              {impact.references.length === 0 ? (
                <div className="delete-state delete-state-ready" role="status">
                  <strong>Ready to delete</strong>
                  <span>No dependent references were found. The mutation is atomic.</span>
                </div>
              ) : (
                <section className={blockers.length ? 'delete-reference-list delete-reference-list-blocked' : 'delete-reference-list'}>
                  <h3>{blockers.length ? 'References block deletion' : 'Select allowed cascades'}</h3>
                  <p>
                    References are never migrated by the frontend. Open an owner to resolve a blocker.
                  </p>
                  {impact.references.map((reference) => (
                    <DeleteReference
                      key={reference.referenceId}
                      project={project}
                      reference={reference}
                      selected={selectedCascades.includes(reference.referenceId)}
                      onSelected={(selected) =>
                        setSelectedCascades((current) => selected
                          ? [...current, reference.referenceId]
                          : current.filter((id) => id !== reference.referenceId))
                      }
                    />
                  ))}
                </section>
              )}
            </>
          ) : null}
          {error ? <p className="modal-form-error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-footer">
          <span className="modal-hint">
            Impact and expected model revision are checked again on Delete.
          </span>
          <div className="modal-footer-actions">
            <button type="button" disabled={busy === 'delete'} onClick={() => appStoreActions.closeModal()}>
              {successRevision ? 'Close' : 'Cancel'}
            </button>
            {!successRevision ? (
              <button
                type="button"
                className="danger-button"
                disabled={!canDelete}
                onClick={() => void remove()}
              >
                {busy === 'delete' ? 'Deleting...' : `Delete ${copy.subject}`}
              </button>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  );
}

function DeleteReference({
  project,
  reference,
  selected,
  onSelected,
}: {
  project: ProjectDto;
  reference: CommandElementReferenceDto;
  selected: boolean;
  onSelected: (selected: boolean) => void;
}) {
  const selection = referenceSelection(project, reference);
  return (
    <div className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}>
      <input
        type="checkbox"
        aria-label={`Cascade ${reference.elementName}`}
        disabled={!reference.cascadeAllowed}
        checked={selected}
        onChange={(event) => onSelected(event.target.checked)}
      />
      <span>
        <strong>{reference.elementName}</strong>
        <small>
          {reference.relation}
          {reference.path ? ` · ${reference.path}` : ''}
          {reference.sourceRange ? ` · source ${reference.sourceRange.startLine}:${reference.sourceRange.startColumn}` : ''}
        </small>
        {selection ? (
          <button
            type="button"
            className="delete-impact-navigation"
            onClick={() => {
              appStoreActions.closeModal();
              window.setTimeout(() => appStoreActions.select(selection), 0);
            }}
          >
            Open {referenceTargetLabel(reference.elementType)}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function loadImpact(projectId: string, modal: DeleteModal) {
  return modal.targetKind === 'DATATYPE_PROPERTY'
    ? modelCommandApi.getDataTypePropertyDeleteImpact(projectId, modal.ownerId!, modal.elementId)
    : modelCommandApi.getDeleteImpact(projectId, modal.targetKind, modal.elementId);
}

function impactFromError(error: unknown) {
  if (!(error instanceof ApiClientError)) return null;
  const candidate = error.dto.details?.currentImpact as Partial<DeleteImpactDto> | undefined;
  return candidate && typeof candidate.revision === 'string' && candidate.target && Array.isArray(candidate.references)
    ? candidate as DeleteImpactDto
    : null;
}

function deleteError(error: unknown) {
  if (error instanceof ApiClientError) {
    return `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`;
  }
  return error instanceof Error ? error.message : 'The delete command failed.';
}

function targetCopy(modal: DeleteModal) {
  switch (modal.targetKind) {
    case 'ENUMERATION': return { subject: 'Enumeration', description: `Review every reference before deleting ${modal.elementName}.` };
    case 'ENUMERATION_LITERAL': return { subject: 'Literal', description: `${modal.ownerName ?? 'The Enumeration'} remains; only ${modal.elementName} is affected.` };
    case 'DATATYPE': return { subject: 'DataType', description: `Review every structured value and type reference before deleting ${modal.elementName}.` };
    case 'DATATYPE_PROPERTY': return { subject: 'Value Property', description: `${modal.ownerName ?? 'The DataType'} remains; existing values are never migrated automatically.` };
  }
}

function referenceSelection(project: ProjectDto, reference: CommandElementReferenceDto): Exclude<SelectionState, null> | null {
  const kind = reference.elementType.toUpperCase();
  if (kind === 'CLASS') return { view: 'class-diagram', type: 'class', id: reference.elementId };
  if (kind === 'ASSOCIATION') return { view: 'class-diagram', type: 'association', id: reference.elementId };
  if (kind === 'INVARIANT') return { view: 'class-diagram', type: 'invariant', id: reference.elementId };
  if (kind === 'DATATYPE') return { view: 'class-diagram', type: 'dataType', id: reference.elementId };
  if (kind === 'ENUMERATION') return { view: 'class-diagram', type: 'enumeration', id: reference.elementId };
  if (kind === 'PACKAGE') return { view: 'class-diagram', type: 'package', id: reference.elementId };
  if (kind === 'IMPORT') return { view: 'class-diagram', type: 'import', id: reference.elementId };
  if (kind === 'OBJECT') return { view: 'object-diagram', type: 'object', id: reference.elementId };
  if (kind === 'OBJECT_LINK') return { view: 'object-diagram', type: 'objectLink', id: reference.elementId };
  if (kind === 'ATTRIBUTE' || kind === 'OPERATION') {
    const owner = project.umlModel.classes.find((candidate) =>
      kind === 'ATTRIBUTE'
        ? candidate.attributes.some((attribute) => attribute.id === reference.elementId)
        : candidate.operations.some((operation) => operation.id === reference.elementId));
    return owner ? { view: 'class-diagram', type: 'class', id: owner.id } : null;
  }
  if (kind === 'SLOT') {
    const owner = project.objectModel.objects.find((candidate) =>
      candidate.slots.some((slot) => slot.id === reference.elementId));
    return owner ? { view: 'object-diagram', type: 'object', id: owner.id } : null;
  }
  return null;
}

function referenceTargetLabel(elementType: string) {
  return elementType.toLocaleLowerCase().replace(/_/g, ' ');
}
