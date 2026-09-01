import type { ProjectDto, ValidationErrorDto } from '../../../api';
import { appStoreActions, useAppStore, type BottomPanelTab } from '../../../state';
import { ValidationResultsPanel } from './ValidationResultsPanel';

interface BottomPanelProps {
  project: ProjectDto | null;
  diagnostics?: ValidationErrorDto[];
}

const tabs: Array<{ id: BottomPanelTab; label: string }> = [
  { id: 'console', label: 'Console' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'validation-results', label: 'Validation Results' },
  { id: 'invocation-results', label: 'Invocation Results' },
];

export function BottomPanel({ project, diagnostics = [] }: BottomPanelProps) {
  const activeTab = useAppStore((state) => state.activeBottomPanelTab);
  const consoleLogs = useAppStore((state) => state.consoleLogs);
  const validation = useAppStore((state) => state.validation);
  const invocation = useAppStore((state) => state.invocationResult);

  return (
    <section className="bottom-panel" aria-label="Bottom Panel">
      <div className="bottom-tabs" role="tablist" aria-label="Bottom panel tabs">
        {tabs.map((tab, index) => (
          <button
            id={`bottom-tab-${tab.id}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-controls={`bottom-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => appStoreActions.setActiveBottomPanelTab(tab.id)}
            onKeyDown={(event) => {
              const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
              if (!offset && event.key !== 'Home' && event.key !== 'End') return;
              event.preventDefault();
              const nextTab = tabs[nextIndex];
              document.getElementById(`bottom-tab-${nextTab.id}`)?.focus();
              appStoreActions.setActiveBottomPanelTab(nextTab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`bottom-panel-${activeTab}`}
        className={`bottom-panel-content bottom-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`bottom-tab-${activeTab}`}
      >
        {activeTab === 'console' ? (
          consoleLogs.length === 0 ? (
            <BottomEmpty title="Console is clear" detail="Workspace activity will appear here." />
          ) : (
            <ul className="console-log-list">
              {consoleLogs.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.level.toUpperCase()}</strong>
                  <span>{entry.message}</span>
                  <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {activeTab === 'diagnostics' ? (
          diagnostics.length === 0 ? (
            <BottomEmpty
              title="No diagnostics"
              detail="Parser and type diagnostics will appear here."
            />
          ) : (
            <ul className="console-log-list">
              {diagnostics.map((diagnostic) => (
                <li key={diagnostic.id}>
                  <strong>{diagnostic.code}</strong>
                  <span>{diagnostic.userMessage ?? diagnostic.message}</span>
                  <span>{formatTarget(diagnostic)}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {activeTab === 'validation-results' ? (
          <ValidationResultsPanel validation={validation} project={project} />
        ) : null}
        {activeTab === 'invocation-results' ? (
          invocation ? <InvocationResults result={invocation} project={project} /> : <BottomEmpty title="No invocation results" detail="Operation invocation results will appear here." />
        ) : null}
      </div>
    </section>
  );
}

function InvocationResults({ result, project }: { result: import('../../../api').OperationInvocationResultDto; project: ProjectDto | null }) {
  const lifecycle = [
    ...result.lifecycle.createdObjects.map((reference) => ({ ...reference, change: 'Created' })),
    ...result.lifecycle.changedObjects.map((reference) => ({ ...reference, change: 'Changed' })),
    ...result.lifecycle.deletedObjects.map((reference) => ({ ...reference, change: 'Deleted' })),
  ];
  return (
    <div className="invocation-results" data-status={result.status}>
      <header className="invocation-result-header">
        <div><strong>{result.resolvedOperationName}</strong><span>{result.receiver.name} : {result.receiver.typeName}</span></div>
        <span className="invocation-status">{result.status}</span>
      </header>
      <dl className="invocation-result-grid">
        <div><dt>Result</dt><dd>{formatValue(result.result)}</dd></div>
        <div><dt>Resolved operation</dt><dd>{result.resolvedOperationName}{result.resolvedOperationId !== result.requestedOperationId ? ' (runtime dispatch)' : ''}</dd></div>
        <div><dt>Snapshot</dt><dd>{result.status === 'SUCCEEDED' ? result.afterSnapshotId : result.beforeSnapshotId}</dd></div>
        <div><dt>Revision</dt><dd>{result.revision}</dd></div>
      </dl>
      <section className="invocation-state-comparison" aria-label="Invocation state comparison">
        <div><span>Before</span><strong>{result.beforeSnapshotId}</strong><small>Immutable invocation input</small></div>
        <div data-candidate={Boolean(result.candidateAfterSnapshotId)}><span>{result.status === 'SUCCEEDED' ? 'After' : 'Candidate After'}</span><strong>{result.afterSnapshotId ?? result.candidateAfterSnapshotId ?? 'Not created'}</strong><small>{result.status === 'SUCCEEDED' ? 'Committed' : result.status === 'ROLLED_BACK' ? 'Discarded and not persisted' : 'Operation body was not executed'}</small></div>
      </section>
      {result.outValues.length > 0 ? <section><h4>Output values</h4><ul>{result.outValues.map((entry) => <li key={entry.parameterId}><strong>{entry.parameterName}</strong><span>{formatValue(entry.value)}</span></li>)}</ul></section> : null}
      {lifecycle.length > 0 ? <section><h4>Lifecycle changes</h4><ul>{lifecycle.map((entry) => <li key={`${entry.change}-${entry.id}`}><strong>{entry.change}</strong><span>{entry.name} : {entry.typeName}</span></li>)}</ul></section> : null}
      {result.diagnostics.length > 0 ? <section><h4>Diagnostics</h4><ul>{result.diagnostics.map((diagnostic) => <li key={diagnostic}><strong>{diagnostic}</strong></li>)}</ul></section> : null}
      {result.contractResults.length > 0 ? <section><h4>Contract checks</h4><div className="invocation-contract-results">{result.contractResults.map((contract) => <article key={contract.contractId} data-status={contract.status}>
        <header><span className={`contract-kind contract-kind-${contract.kind.toLowerCase()}`}>{contract.kind}</span><strong>{contract.contractName}</strong><span>{contract.status.replace(/_/g, ' ')}</span></header>
        <p>{contractSummary(contract.kind, contract.status, result.status)}</p>
        {contract.diagnostics.length > 0 ? <ul className="invocation-contract-diagnostics">{contract.diagnostics.map((diagnostic, index) => <li key={diagnostic.id ?? `${diagnostic.code}-${index}`}><strong>{diagnostic.code}</strong><span>{diagnostic.userMessage ?? diagnostic.message}</span><small>{diagnosticLocation(diagnostic)}</small></li>)}</ul> : null}
        <button type="button" onClick={() => openContract(project, result.resolvedOwnerClassId)}>Open {contract.kind === 'PRE' ? 'precondition' : 'postcondition'}</button>
      </article>)}</div></section> : null}
    </div>
  );
}

function contractSummary(kind: string, status: string, invocationStatus: string) {
  if (status === 'VIOLATED' && kind === 'PRE') return 'The condition was false in the Before state. The operation body was not executed.';
  if (status === 'VIOLATED' && kind === 'POST') return 'The condition was false in the Candidate After state. Candidate changes were rolled back.';
  if (status === 'NOT_EVALUATED') return 'This contract was not evaluated because an earlier contract stopped the invocation.';
  if (status === 'CONTEXT_ERROR') return 'The backend could not typecheck or evaluate this contract in its operation context.';
  return `${kind === 'PRE' ? 'Before' : invocationStatus === 'SUCCEEDED' ? 'After' : 'Candidate After'} state satisfied this contract.`;
}

function diagnosticLocation(diagnostic: import('../../../api').OclDiagnosticDto) {
  const range = diagnostic.sourceRange ?? diagnostic.range ?? diagnostic.target?.range ?? diagnostic.targets?.[0]?.range;
  return range ? `Source ${range.startLine}:${range.startColumn}` : 'Operation contract';
}

function openContract(project: ProjectDto | null, ownerClassId: string) {
  if (!project?.umlModel.classes.some((candidate) => candidate.id === ownerClassId)) return;
  appStoreActions.select({ view: 'class-diagram', type: 'class', id: ownerClassId });
}

function formatValue(value: import('../../../api').SlotValueDto | null) {
  if (!value) return 'null';
  if (value.type.toLowerCase() === 'invalid') return 'invalid';
  if (value.value === null) return `null : ${value.type}`;
  if (typeof value.value === 'object') return `${JSON.stringify(value.value)} : ${value.type}`;
  return `${String(value.value)} : ${value.type}`;
}

function BottomEmpty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bottom-panel-empty">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
}

function formatTarget(diagnostic: ValidationErrorDto) {
  const target = diagnostic.targets[0];
  if (!target) return 'Model';
  const range = target.range;
  return range
    ? `${target.path ?? target.elementType} ${range.startLine}:${range.startColumn}`
    : (target.path ?? target.elementType);
}
