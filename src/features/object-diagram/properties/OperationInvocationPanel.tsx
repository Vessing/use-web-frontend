import { useMemo, useState } from 'react';

import {
  ApiClientError,
  operationInvocationApi,
  type ObjectInstanceDto,
  type ProjectDto,
  type ProjectReadModelDto,
  type SlotValueDto,
  type UmlParameterDto,
} from '../../../api';
import { appStoreActions } from '../../../state';
import { PropertySection } from '../../class-diagram/properties/ClassPropertiesPanel';

interface Props {
  project: ProjectDto;
  object: ObjectInstanceDto;
  readModel?: ProjectReadModelDto | null;
  readVersion: string;
  onRefreshProject: () => Promise<boolean>;
}

export function OperationInvocationPanel({ project, object, readModel, readVersion, onRefreshProject }: Props) {
  const operations = useMemo(() => effectiveOperations(project, object.classId, readModel), [object.classId, project, readModel]);
  const [operationId, setOperationId] = useState(operations[0]?.operation.id ?? '');
  const selected = operations.find((candidate) => candidate.operation.id === operationId) ?? operations[0];
  const [argumentsById, setArgumentsById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; parameterId?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (operations.length === 0) {
    return <PropertySection title="Operations"><p className="property-empty">No invokable operations are projected for {object.name}.</p></PropertySection>;
  }

  const revision = invocationRevision(project, readVersion);
  const inputParameters = selected.operation.parameters.filter((parameter) => direction(parameter) !== 'OUT');
  const parseErrors = Object.fromEntries(inputParameters.map((parameter) => [parameter.id, parseArgument(project, parameter, argumentsById[parameter.id] ?? '').error]).filter(([, value]) => value));
  const invoke = async () => {
    if (!selected || !Number.isFinite(revision) || Object.keys(parseErrors).length > 0 || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await operationInvocationApi.invoke(project.project.id, selected.operation.id, {
        receiverObjectId: object.id,
        operationId: selected.operation.id,
        expectedRevision: revision,
        arguments: inputParameters.map((parameter) => ({
          parameterId: parameter.id,
          value: parseArgument(project, parameter, argumentsById[parameter.id] ?? '').value!,
        })),
      });
      appStoreActions.setInvocationResult(result);
      if (result.status === 'SUCCEEDED') {
        if (!await onRefreshProject()) throw new Error('The authoritative snapshot could not be reloaded.');
        setNotice(`Invocation succeeded at snapshot revision ${result.revision}.`);
      } else {
        setNotice(`Invocation ${result.status.toLowerCase()}; the current snapshot was preserved.`);
      }
      appStoreActions.addConsoleLog({ level: result.status === 'SUCCEEDED' ? 'info' : 'warning', source: 'api', message: `${selected.operation.name} on ${object.name}: ${result.status}.` });
    } catch (caught) {
      const detail = invocationError(caught);
      setError(detail);
      appStoreActions.addConsoleLog({ level: 'error', source: 'api', message: detail.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PropertySection title="Invoke Operation">
      <div className="operation-invocation" aria-busy={busy}>
        <label className="property-field"><span>Receiver</span><input value={`${object.name} : ${className(project, object.classId)}`} readOnly /></label>
        <label className="property-field"><span>Operation</span><select value={selected.operation.id} onChange={(event) => { const nextId = event.target.value; const next = operations.find((candidate) => candidate.operation.id === nextId); setOperationId(nextId); setArgumentsById((current) => Object.fromEntries((next?.operation.parameters ?? []).filter((parameter) => direction(parameter) !== 'OUT').map((parameter) => [parameter.id, current[parameter.id] ?? '']))); setError(null); setNotice(null); }}>{operations.map((candidate) => <option key={candidate.operation.id} value={candidate.operation.id}>{candidate.operation.name}({candidate.operation.parameters.map((parameter) => `${parameter.name}: ${parameter.type}`).join(', ')}) : {candidate.operation.returnType}{candidate.inherited ? ` - inherited from ${candidate.ownerName}` : ''}</option>)}</select></label>
        {selected.operation.abstractOperation ? <p className="properties-message properties-message-error">Abstract operations cannot be invoked.</p> : null}
        <div className="operation-argument-list">
          {selected.operation.parameters.map((parameter) => direction(parameter) === 'OUT' ? (
            <label key={parameter.id} className="property-field"><span>{parameter.name} : {parameter.type} (out)</span><input value="Returned by the backend" readOnly /></label>
          ) : (
            <ArgumentField key={parameter.id} project={project} parameter={parameter} value={argumentsById[parameter.id] ?? ''} error={parseErrors[parameter.id] ?? (error?.parameterId === parameter.id ? error.message : null)} onChange={(value) => setArgumentsById((current) => ({ ...current, [parameter.id]: value }))} />
          ))}
        </div>
        {error && !error.parameterId ? <p className="properties-message properties-message-error" role="alert">{error.message}</p> : null}
        {notice ? <p className="properties-message properties-message-success" role="status">{notice}</p> : null}
        {!Number.isFinite(revision) ? <p className="properties-message properties-message-error">A numeric snapshot revision is required before invocation.</p> : null}
        <div className="properties-actions"><button type="button" className="primary-button" disabled={busy || selected.operation.abstractOperation || !Number.isFinite(revision) || Object.keys(parseErrors).length > 0} onClick={() => void invoke()}>{busy ? 'Invoking...' : 'Invoke Operation'}</button></div>
      </div>
    </PropertySection>
  );
}

function ArgumentField({ project, parameter, value, error, onChange }: { project: ProjectDto; parameter: UmlParameterDto; value: string; error?: string | null; onChange: (value: string) => void }) {
  const label = `${parameter.name} : ${parameter.type} (${direction(parameter).toLowerCase()})`;
  if (parameter.type === 'Boolean') return <label className="property-field"><span>{label}</span><select value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)}><option value="">Select a value</option><option value="true">true</option><option value="false">false</option></select>{error ? <small className="property-field-error">{error}</small> : null}</label>;
  const classObjects = project.umlModel.classes.some((candidate) => candidate.name === parameter.type)
    ? project.objectModel.objects.filter((candidate) => className(project, candidate.classId) === parameter.type)
    : [];
  if (classObjects.length > 0) return <label className="property-field"><span>{label}</span><select value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)}><option value="">Select an object</option>{classObjects.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select>{error ? <small className="property-field-error">{error}</small> : null}</label>;
  return <label className="property-field"><span>{label}</span><input value={value} aria-invalid={Boolean(error) || undefined} onChange={(event) => onChange(event.target.value)} />{error ? <small className="property-field-error">{error}</small> : null}</label>;
}

function effectiveOperations(project: ProjectDto, classId: string, readModel?: ProjectReadModelDto | null) {
  const byId = new Map(project.umlModel.classes.flatMap((owner) => owner.operations.map((operation) => [operation.id, { operation, ownerName: owner.name }] as const)));
  const projection = readModel?.classes.find((candidate) => candidate.id === classId);
  if (projection) return projection.operations.flatMap((feature) => {
    const match = byId.get(feature.id);
    return match ? [{ ...match, inherited: feature.inherited }] : [];
  });
  const owner = project.umlModel.classes.find((candidate) => candidate.id === classId);
  return (owner?.operations ?? []).map((operation) => ({ operation, ownerName: owner?.name ?? classId, inherited: false }));
}

function parseArgument(project: ProjectDto, parameter: UmlParameterDto, raw: string): { value?: SlotValueDto; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'A value is required.' };
  if (parameter.type === 'Integer') return /^-?\d+$/.test(trimmed) ? { value: { type: 'Integer', value: Number(trimmed) } } : { error: 'Enter an integer.' };
  if (parameter.type === 'Real') return Number.isFinite(Number(trimmed)) ? { value: { type: 'Real', value: Number(trimmed) } } : { error: 'Enter a number.' };
  if (parameter.type === 'Boolean') return trimmed === 'true' || trimmed === 'false' ? { value: { type: 'Boolean', value: trimmed === 'true' } } : { error: 'Select true or false.' };
  const classifier = project.umlModel.classes.find((candidate) => candidate.name === parameter.type);
  if (classifier && !project.objectModel.objects.some((candidate) => candidate.id === trimmed)) return { error: `Select a ${parameter.type} object.` };
  return { value: { type: parameter.type, value: trimmed } };
}

function direction(parameter: UmlParameterDto) {
  return (parameter.direction ?? 'IN').toUpperCase() as 'IN' | 'OUT' | 'INOUT';
}

function className(project: ProjectDto, classId: string) {
  return project.umlModel.classes.find((candidate) => candidate.id === classId)?.name ?? classId;
}

function invocationRevision(project: ProjectDto, fallback: string) {
  const updatedAt = project.project.updatedAt ? Date.parse(project.project.updatedAt) : Number.NaN;
  return Number.isFinite(updatedAt) ? updatedAt : Number(fallback);
}

function invocationError(error: unknown): { message: string; parameterId?: string } {
  if (error instanceof ApiClientError) {
    const parameterId = typeof error.dto.details?.parameterId === 'string' ? error.dto.details.parameterId : undefined;
    return { message: `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`, parameterId };
  }
  return { message: error instanceof Error ? error.message : 'The operation invocation failed.' };
}
