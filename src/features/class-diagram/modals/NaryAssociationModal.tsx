import { useState, type FormEvent } from 'react';
import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto, UmlAssociationEndDto } from '../../../api/dtos';
import { appStoreActions, type ModalState } from '../../../state';
import { parseMultiplicity } from '../properties/multiplicity';

export function NaryAssociationModal({ modal, project, expectedRevision, onRefreshProject }: { modal: Extract<Exclude<ModalState, null>, { type: 'addClassAssociation' }>; project: ProjectDto; expectedRevision: string; onRefreshProject: () => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [ends, setEnds] = useState<UmlAssociationEndDto[]>([
    createEnd(project, modal.sourceClassId ?? project.umlModel.classes[0]?.id ?? '', '1'),
    createEnd(project, modal.targetClassId ?? project.umlModel.classes[1]?.id ?? project.umlModel.classes[0]?.id ?? '', '0..*'),
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validate(name, ends);
  const patchEnd = (id: string, patch: Partial<UmlAssociationEndDto>) => setEnds((current) => current.map((end) => ({
    ...end,
    ...(end.id === id ? patch : {}),
    ...(patch.aggregationKind === 'COMPOSITE' && end.id !== id ? { aggregationKind: 'NONE' } : {}),
  })));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (errors.length || !expectedRevision) return;
    const id = `association-${crypto.randomUUID()}`;
    setBusy(true); setError(null);
    try {
      await modelCommandApi.createAssociation(project.project.id, { expectedRevision, draft: { id, name: name.trim(), ends: normalizeEnds(ends), associationClassId: null } });
      await onRefreshProject();
      appStoreActions.select({ view: 'class-diagram', type: 'association', id });
      appStoreActions.addConsoleLog({ level: 'info', source: 'api', message: `Association "${name.trim()}" with ${ends.length} ends created.` });
      appStoreActions.closeModal();
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation"><form className="modal-dialog nary-association-dialog" role="dialog" aria-modal="true" aria-labelledby="nary-association-title" onSubmit={submit}><header className="modal-header"><h2 id="nary-association-title">Create Association</h2><button type="button" className="icon-button" onClick={appStoreActions.closeModal}>Close</button></header><div className="modal-body"><label className="modal-field"><span>Association Name</span><input autoFocus value={name} aria-invalid={!name.trim() || undefined} onChange={(event) => setName(event.target.value)} /></label><div className="nary-end-list">{ends.map((end, index) => <EndDraft key={end.id} end={end} index={index} project={project} canRemove={ends.length > 2} onChange={(patch) => patchEnd(end.id, patch)} onRemove={() => setEnds((current) => current.filter((item) => item.id !== end.id))} />)}</div><button type="button" onClick={() => setEnds((current) => [...current, createEnd(project, project.umlModel.classes[0]?.id ?? '', '0..*')])}>Add End</button>{ends.length > 2 ? <p className="modal-hint">The saved association uses a central n-ary diagram node.</p> : null}{errors.length ? <p className="modal-form-error" role="alert">{errors.join(' ')}</p> : null}{error ? <p className="modal-form-error" role="alert">{error}</p> : null}</div><footer className="modal-footer"><button type="button" onClick={appStoreActions.closeModal}>Cancel</button><button type="submit" className="primary-button" disabled={busy || Boolean(errors.length) || !expectedRevision}>{busy ? 'Creating...' : 'Create Association'}</button></footer></form></div>;
}

function EndDraft({ end, index, project, canRemove, onChange, onRemove }: { end: UmlAssociationEndDto; index: number; project: ProjectDto; canRemove: boolean; onChange: (patch: Partial<UmlAssociationEndDto>) => void; onRemove: () => void }) {
  const qualifiers = end.qualifiers ?? [];
  return <section className="modal-section nary-end-draft"><div className="modal-section-header"><h3>End {index + 1}</h3>{canRemove ? <button type="button" className="danger-button" onClick={onRemove}>Remove End</button> : null}</div><div className="modal-row-grid"><label className="modal-field"><span>Classifier</span><select value={end.classId} onChange={(event) => onChange({ classId: event.target.value })}>{project.umlModel.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="modal-field"><span>Role (optional)</span><input value={end.roleName ?? ''} onChange={(event) => onChange({ roleName: event.target.value })} /></label><label className="modal-field"><span>Multiplicity</span><input value={end.multiplicity.raw} onChange={(event) => { const value=parseMultiplicity(event.target.value); if(value) onChange({ multiplicity:value }); }} /></label><label className="modal-field"><span>Aggregation kind</span><select aria-label={`End ${index + 1} aggregation kind`} value={end.aggregationKind ?? 'NONE'} onChange={(event) => onChange({ aggregationKind: event.target.value as NonNullable<UmlAssociationEndDto['aggregationKind']> })}><option value="NONE">None</option><option value="SHARED">Shared aggregation</option><option value="COMPOSITE">Composition</option></select></label></div><div className="qualifier-editor"><strong>Qualifiers</strong>{qualifiers.map((qualifier, qualifierIndex) => <div className="qualifier-row" key={qualifier.id}><input aria-label={`End ${index + 1} qualifier ${qualifierIndex + 1} name`} value={qualifier.name} onChange={(event) => onChange({ qualifiers: qualifiers.map((item) => item.id === qualifier.id ? { ...item, name:event.target.value } : item) })} /><select aria-label={`Qualifier ${qualifierIndex + 1} type`} value={qualifier.type} onChange={(event) => onChange({ qualifiers: qualifiers.map((item) => item.id === qualifier.id ? { ...item, type:event.target.value } : item) })}><option>String</option><option>Integer</option><option>Real</option><option>Boolean</option></select><button type="button" onClick={() => onChange({ qualifiers: qualifiers.filter((item) => item.id !== qualifier.id).map((item, order) => ({ ...item, order })) })}>Remove</button></div>)}<button type="button" onClick={() => onChange({ qualifiers: [...qualifiers, { id:`qualifier-${crypto.randomUUID()}`, name:'', type:'String', order:qualifiers.length }] })}>Add Qualifier</button></div></section>;
}

function createEnd(project: ProjectDto, classId: string, raw: string): UmlAssociationEndDto { return { id:`association-end-${crypto.randomUUID()}`, classId, roleName:'', multiplicity:parseMultiplicity(raw)!, navigable:true, ordered:false, unique:true, derived:false, union:false, subsettedEndIds:[], redefinedEndIds:[], navigationType:null, qualifiers:[], aggregationKind:'NONE' }; }
function validate(name: string, ends: UmlAssociationEndDto[]) { const errors:string[]=[]; if(!name.trim()) errors.push('Association name is required.'); if(ends.length < 2 || ends.some((end)=>!end.classId)) errors.push('Every end requires a classifier.'); for(const [index,end] of ends.entries()){const names=(end.qualifiers??[]).map(q=>q.name.trim());if(names.some(value=>!value)||new Set(names).size!==names.length)errors.push(`End ${index+1} contains invalid qualifier names.`);} return errors; }
function normalizeEnds(ends: UmlAssociationEndDto[]) { return ends.map((end) => ({ ...end, roleName: end.roleName?.trim() || null })); }
function message(error: unknown) { return error instanceof ApiClientError ? `${error.dto.userMessage ?? error.message} (${error.dto.code})` : error instanceof Error ? error.message : 'Association could not be created.'; }
