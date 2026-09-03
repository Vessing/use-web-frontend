import { useEffect, useMemo, useState } from 'react';

import {
  ApiClientError,
  modelCommandApi,
  type DeleteImpactDto,
  type ProjectDto,
  type ProjectReadModelDto,
  type UmlModelImportDto,
  type UmlPackageDto,
} from '../../../api';
import { appStoreActions } from '../../../state';
import { DefinitionPropertiesSection } from './DefinitionPropertiesSection';

interface SharedProps {
  project: ProjectDto;
  readModel: ProjectReadModelDto | null;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
}

export function PackagePropertiesPanel({
  project,
  umlPackage,
  readVersion,
  onRefreshProject,
}: SharedProps & { umlPackage: UmlPackageDto }) {
  const packages = useMemo(() => project.umlModel.packages ?? [], [project.umlModel.packages]);
  const initial = useMemo(() => packageDraft(umlPackage, packages), [packages, umlPackage]);
  const [name, setName] = useState(initial.name);
  const [parentPackageId, setParentPackageId] = useState(initial.parentPackageId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setParentPackageId(initial.parentPackageId);
    setError(null);
    setFieldErrors({});
  }, [initial]);

  const parent = packages.find((candidate) => candidate.id === parentPackageId);
  const qualifiedName = parent ? `${parent.qualifiedName}::${name.trim()}` : name.trim();
  const canSave = Boolean(name.trim()) && Boolean(readVersion) && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true); setError(null); setFieldErrors({}); setNotice(null);
    const draft = { id: umlPackage.id, qualifiedName };
    try {
      const result = await modelCommandApi.updatePackage(project.project.id, umlPackage.id, {
        expectedRevision: readVersion,
        draft,
      });
      if (!await onRefreshProject()) throw new Error('The authoritative project projection could not be reloaded.');
      setNotice(`Package saved at model revision ${result.revision}.`);
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Package ${result.result.qualifiedName} saved at model revision ${result.revision}.` });
    } catch (caught) {
      setError(commandMessage(caught)); setFieldErrors(commandFieldErrors(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="properties-content package-import-properties" aria-busy={busy}>
      <header className="package-import-properties-header">
        <div><span className="properties-eyebrow">Package Properties</span><h3>{umlPackage.qualifiedName}</h3></div>
        <span className="property-status-badge">LOCAL</span>
      </header>
      <label className="property-field"><span>Package name</span><input value={name} aria-invalid={Boolean(fieldErrors.name ?? fieldErrors.qualifiedName) || undefined} onChange={(event) => setName(event.target.value)} />{fieldErrors.name ?? fieldErrors.qualifiedName ? <small className="property-field-error">{fieldErrors.name ?? fieldErrors.qualifiedName}</small> : null}</label>
      <label className="property-field"><span>Parent package</span><select value={parentPackageId} aria-invalid={Boolean(fieldErrors.parentPackageId) || undefined} onChange={(event) => setParentPackageId(event.target.value)}><option value="">Project root</option>{packages.filter((candidate) => candidate.id !== umlPackage.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.qualifiedName}</option>)}</select>{fieldErrors.parentPackageId ? <small className="property-field-error">{fieldErrors.parentPackageId}</small> : null}</label>
      <label className="property-field property-field-readonly"><span>Qualified name</span><input value={qualifiedName} readOnly /></label>
      {error ? <div className="properties-message properties-message-error" role="alert">{error}</div> : null}
      {notice ? <div className="properties-message properties-message-success" role="status">{notice}</div> : null}
      <footer className="properties-actions"><button type="button" onClick={() => { setName(initial.name); setParentPackageId(initial.parentPackageId); setError(null); setFieldErrors({}); }}>Reset</button><button type="button" className="primary-button" disabled={!canSave} onClick={() => void save()}>{busy ? 'Saving...' : 'Save Package'}</button><button type="button" className="danger-button" onClick={() => setShowDelete(true)}>Delete Package</button></footer>
      <section className="property-section package-definitions-section"><h4>Definitions</h4><DefinitionPropertiesSection project={project} ownerKind="PACKAGE" ownerId={umlPackage.id} ownerName={umlPackage.qualifiedName} revision={readVersion} onRefreshProject={onRefreshProject} /></section>
      {showDelete ? <DeleteModelElementDialog project={project} elementType="PACKAGE" elementId={umlPackage.id} elementName={umlPackage.qualifiedName} fallbackRevision={readVersion} onCancel={() => setShowDelete(false)} onDeleted={onRefreshProject} /> : null}
    </div>
  );
}

export function ImportPropertiesPanel({
  project,
  readModel,
  modelImport,
  readVersion,
  onRefreshProject,
}: SharedProps & { modelImport: UmlModelImportDto }) {
  const packages = project.umlModel.packages ?? [];
  const [draft, setDraft] = useState(modelImport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const importedNodes = readModel?.explorer.filter((node) => node.importId === modelImport.id && node.kind !== 'IMPORT_ROOT') ?? [];

  useEffect(() => {
    setDraft(modelImport); setError(null); setFieldErrors({});
  }, [modelImport]);

  const canSave = Boolean(draft.importingPackageId) && Boolean(draft.importedPackageId) && Boolean(readVersion) && !busy;
  const save = async () => {
    if (!canSave) return;
    setBusy(true); setError(null); setFieldErrors({}); setNotice(null);
    try {
      const result = await modelCommandApi.updateImport(project.project.id, modelImport.id, {
        expectedRevision: readVersion,
        draft,
      });
      if (!await onRefreshProject()) throw new Error('The authoritative project projection could not be reloaded.');
      setNotice(`Import saved at model revision ${result.revision}.`);
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Import ${importDisplayName(result.result, packages)} saved at model revision ${result.revision}.` });
    } catch (caught) {
      setError(commandMessage(caught)); setFieldErrors(commandFieldErrors(caught));
    } finally {
      setBusy(false);
    }
  };

  const resolved = readModel?.explorer.some((node) => node.kind === 'IMPORT_ROOT' && node.importId === modelImport.id) ?? false;
  return (
    <div className="properties-content package-import-properties" aria-busy={busy}>
      <header className="package-import-properties-header"><div><span className="properties-eyebrow">Import Details</span><h3>{draft.alias || packageName(project, draft.importedPackageId)}</h3></div><span className="property-status-badge">{resolved ? 'RESOLVED' : 'UNAVAILABLE'}</span></header>
      <label className="property-field"><span>Target package</span><select value={draft.importingPackageId} aria-invalid={Boolean(fieldErrors.importingPackageId) || undefined} onChange={(event) => setDraft((current) => ({ ...current, importingPackageId: event.target.value }))}>{packages.map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}</select>{fieldErrors.importingPackageId ? <small className="property-field-error">{fieldErrors.importingPackageId}</small> : null}</label>
      <label className="property-field"><span>Imported package</span><select value={draft.importedPackageId} aria-invalid={Boolean(fieldErrors.importedPackageId) || undefined} onChange={(event) => setDraft((current) => ({ ...current, importedPackageId: event.target.value }))}>{packages.map((item) => <option key={item.id} value={item.id}>{item.qualifiedName}</option>)}</select>{fieldErrors.importedPackageId ? <small className="property-field-error">{fieldErrors.importedPackageId}</small> : null}</label>
      <label className="property-field"><span>Alias</span><input value={draft.alias ?? ''} aria-invalid={Boolean(fieldErrors.alias) || undefined} onChange={(event) => setDraft((current) => ({ ...current, alias: event.target.value || null }))} />{fieldErrors.alias ? <small className="property-field-error">{fieldErrors.alias}</small> : null}</label>
      <label className="property-field"><span>Source</span><input value={draft.source ?? ''} aria-invalid={Boolean(fieldErrors.source) || undefined} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value || null }))} />{fieldErrors.source ? <small className="property-field-error">{fieldErrors.source}</small> : null}</label>
      <label className="property-field property-field-readonly"><span>Provenance</span><input value={draft.provenance ?? 'Not provided'} readOnly /></label>
      <section className="property-section"><h4>Imported Elements</h4><p>{importedNodes.length} projected element{importedNodes.length === 1 ? '' : 's'} in the authoritative explorer.</p><p className="properties-help">Imported model elements remain read-only. This panel edits the import relationship only.</p></section>
      {error ? <div className="properties-message properties-message-error" role="alert">{error}</div> : null}
      {notice ? <div className="properties-message properties-message-success" role="status">{notice}</div> : null}
      <footer className="properties-actions"><button type="button" onClick={() => { setDraft(modelImport); setError(null); setFieldErrors({}); }}>Reset</button><button type="button" className="primary-button" disabled={!canSave} onClick={() => void save()}>{busy ? 'Saving...' : 'Save Import'}</button><button type="button" className="danger-button" onClick={() => setShowDelete(true)}>Remove Import</button></footer>
      {showDelete ? <DeleteModelElementDialog project={project} elementType="IMPORT" elementId={modelImport.id} elementName={draft.alias || packageName(project, draft.importedPackageId)} fallbackRevision={readVersion} onCancel={() => setShowDelete(false)} onDeleted={onRefreshProject} /> : null}
    </div>
  );
}

function DeleteModelElementDialog({ project, elementType, elementId, elementName, fallbackRevision, onCancel, onDeleted }: { project: ProjectDto; elementType: 'PACKAGE' | 'IMPORT'; elementId: string; elementName: string; fallbackRevision: string; onCancel: () => void; onDeleted: () => Promise<boolean> }) {
  const [impact, setImpact] = useState<DeleteImpactDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    void modelCommandApi.getDeleteImpact(project.project.id, elementType, elementId)
      .then((result) => { if (active) setImpact(result); })
      .catch((caught) => { if (active) setError(commandMessage(caught)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [elementId, elementType, project.project.id]);
  const blockers = impact?.references.filter((reference) => !reference.cascadeAllowed) ?? [];
  const allowed = impact?.references.filter((reference) => reference.cascadeAllowed) ?? [];
  const selectedAllAllowed = allowed.every((reference) => selected.includes(reference.referenceId));
  const canDelete = Boolean(impact) && blockers.length === 0 && selectedAllAllowed && !busy;
  const remove = async () => {
    if (!impact || !canDelete) return;
    setBusy(true); setError(null);
    try {
      const result = await modelCommandApi.deleteElement(project.project.id, elementType, elementId, { expectedRevision: impact.revision || fallbackRevision, cascadeReferenceIds: selected });
      if (!await onDeleted()) throw new Error('The authoritative project projection could not be reloaded.');
      appStoreActions.select(null);
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `${elementType === 'PACKAGE' ? 'Package' : 'Import'} ${elementName} deleted at model revision ${result.revision}.` });
      onCancel();
    } catch (caught) { setError(commandMessage(caught)); setBusy(false); }
  };
  const title = elementType === 'PACKAGE' ? 'Delete Package' : 'Remove Import';
  return <div className="modal-backdrop" role="presentation"><div className="modal-dialog association-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-package-import-title"><header className="modal-header"><h2 id="delete-package-import-title">{title}</h2><button type="button" className="icon-button" onClick={onCancel}>Close</button></header><div className="modal-body"><p>Are you sure you want to {elementType === 'PACKAGE' ? 'delete' : 'remove'} <strong>{elementName}</strong>?</p>{busy && !impact ? <p className="modal-empty">Checking references...</p> : null}{impact?.references.length === 0 ? <p className="properties-message properties-message-success">No dependent references were found.</p> : null}{impact?.references.map((reference) => <label key={reference.referenceId} className={`delete-impact-row ${reference.cascadeAllowed ? '' : 'delete-impact-blocker'}`}><input type="checkbox" disabled={!reference.cascadeAllowed} checked={selected.includes(reference.referenceId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, reference.referenceId] : current.filter((id) => id !== reference.referenceId))} /><span><strong>{reference.elementName}</strong><small>{reference.relation}{reference.cascadeAllowed ? ' / select to cascade' : ' / blocks deletion'}</small></span></label>)}{allowed.length > 0 && !selectedAllAllowed ? <p className="modal-hint">Select every allowed dependency to confirm the explicit cascade.</p> : null}{error ? <p className="modal-form-error" role="alert">{error}</p> : null}</div><footer className="modal-footer"><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="danger-button" disabled={!canDelete} onClick={() => void remove()}>{busy ? 'Deleting...' : title}</button></footer></div></div>;
}

function packageDraft(umlPackage: UmlPackageDto, packages: UmlPackageDto[]) {
  const segments = umlPackage.qualifiedName.split('::');
  const name = segments.pop() ?? umlPackage.qualifiedName;
  const parentName = segments.join('::');
  return { name, parentPackageId: packages.find((candidate) => candidate.qualifiedName === parentName)?.id ?? '' };
}

function packageName(project: ProjectDto, packageId: string) {
  return project.umlModel.packages?.find((item) => item.id === packageId)?.qualifiedName ?? 'unknown package';
}

function importDisplayName(modelImport: UmlModelImportDto, packages: UmlPackageDto[]) {
  return modelImport.alias?.trim() || packages.find((item) => item.id === modelImport.importedPackageId)?.qualifiedName || 'package import';
}

function commandMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    const fields = error.dto.fieldErrors ? ` ${Object.values(error.dto.fieldErrors).join(' ')}` : '';
    return `${error.dto.userMessage ?? error.message} (${error.dto.code})${fields}`;
  }
  return error instanceof Error ? error.message : 'The command could not be applied.';
}

function commandFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError)) return {};
  if (error.dto.fieldErrors) return error.dto.fieldErrors;
  if (error.dto.code === 'PACKAGE_CYCLE') return { parentPackageId: error.dto.userMessage ?? error.message };
  if (error.dto.code === 'INVALID_PACKAGE' || error.dto.code === 'DUPLICATE_NAMESPACE') return { qualifiedName: error.dto.userMessage ?? error.message };
  if (error.dto.code === 'IMPORT_CYCLE') return { importedPackageId: error.dto.userMessage ?? error.message };
  return {};
}
