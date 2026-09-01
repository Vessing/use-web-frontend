import { useMemo, useState } from 'react';

import type { ExplorerElementDto, ProjectDto, ProjectReadModelDto } from '../../../api';
import type { WorkspaceView } from '../../../app/navigation';
import { appStoreActions, useAppStore, type SelectionState } from '../../../state';

interface ExplorerSidebarProps {
  activeView: WorkspaceView;
  project: ProjectDto | null;
  readModel: ProjectReadModelDto | null;
  isLoading: boolean;
  error: string | null;
}

export function ExplorerSidebar({
  activeView,
  project,
  readModel,
  isLoading,
  error,
}: ExplorerSidebarProps) {
  const [query, setQuery] = useState('');
  const selection = useAppStore((state) => state.selection);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const items = useMemo(() => buildItems(activeView, project), [activeView, project]);
  const filteredItems = items.filter((item) =>
    `${item.name} ${item.detail ?? ''}`.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <aside className="explorer-sidebar" aria-label="Model Explorer">
      <div className="explorer-heading-row">
        <h2>Explorer</h2>
        <div className="explorer-heading-actions">
          {activeView === 'class-diagram' ? (
            <>
              <button type="button" className="explorer-add-button" aria-label="Create package" disabled={!project} onClick={() => appStoreActions.openModal({ type: 'addPackage' })}>P+</button>
              <button type="button" className="explorer-add-button" aria-label="Add import" disabled={!project} onClick={() => appStoreActions.openModal({ type: 'addImport' })}>I+</button>
            </>
          ) : (
            <button type="button" className="explorer-add-button" aria-label="Create object" disabled={!project} onClick={() => appStoreActions.openModal({ type: 'addObject' })}>+</button>
          )}
        </div>
      </div>
      <label className="explorer-search">
        <span className="sr-only">Search model elements</span>
        <input
          type="search"
          value={query}
          placeholder="Search model"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="explorer-tree" aria-live="polite">
        {isLoading ? <p className="explorer-status">Loading model...</p> : null}
        {!isLoading && error ? (
          <p className="explorer-status explorer-status-error">{error}</p>
        ) : null}
        {!isLoading && !error && project ? (
          activeView === 'class-diagram' && readModel ? (
            <><ProjectionTree nodes={readModel.explorer} query={normalizedQuery} selection={selection} /><ModelTypeBranches project={project} query={normalizedQuery} selection={selection} /></>
          ) : (
            <ExplorerBranch
              label={activeView === 'object-diagram' ? 'Object model' : 'Project model'}
              rootLabel={activeView === 'object-diagram' ? 'Object root' : 'Project root'}
              items={filteredItems}
              selection={selection}
              activeView={activeView}
              hasQuery={normalizedQuery.length > 0}
            />
          )
        ) : null}
      </div>
    </aside>
  );
}

function ModelTypeBranches({ project, query, selection }: { project: ProjectDto; query: string; selection: SelectionState }) {
  const groups = [
    { label: 'Enumerations', type: 'enumeration' as const, items: project.umlModel.enumerations ?? [] },
    { label: 'DataTypes', type: 'dataType' as const, items: project.umlModel.dataTypes ?? [] },
  ];
  return <section className="explorer-model-section explorer-model-types" aria-label="Model types">{groups.map((group) => { const items = group.items.filter((item) => `${item.name} ${item.qualifiedName ?? ''}`.toLocaleLowerCase().includes(query)); return <details open key={group.label} className="explorer-group"><summary>{group.label} <span>{items.length}</span></summary>{items.length ? <ul>{items.map((item) => <li key={item.id}><button type="button" className={selection?.type === group.type && selection.id === item.id ? 'explorer-item explorer-item-selected' : 'explorer-item'} onClick={() => appStoreActions.select({ view: 'class-diagram', type: group.type, id: item.id })}><span className={`explorer-kind-dot explorer-kind-${group.type.toLocaleLowerCase()}`} aria-hidden="true" /><span><strong>{item.name}</strong>{item.qualifiedName && item.qualifiedName !== item.name ? <small>{item.qualifiedName}</small> : null}</span></button></li>)}</ul> : <p className="explorer-empty">{query ? 'No matches' : 'Empty'}</p>}</details>; })}</section>;
}

function ProjectionTree({
  nodes,
  query,
  selection,
}: {
  nodes: ExplorerElementDto[];
  query: string;
  selection: SelectionState;
}) {
  const byParent = new Map<string | null, ExplorerElementDto[]>();
  for (const node of nodes) {
    const parent = node.parentNodeId ?? null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
  }
  const matches = (node: ExplorerElementDto): boolean => {
    if (!query || `${node.name} ${node.qualifiedName ?? ''}`.toLocaleLowerCase().includes(query))
      return true;
    return (byParent.get(node.nodeId) ?? []).some(matches);
  };
  return (
    <section className="explorer-model-section">
      <h3>Project model</h3>
      <ul className="explorer-projection-tree">
        {(byParent.get(null) ?? []).filter(matches).map((node) => (
          <ProjectionNode
            key={node.nodeId}
            node={node}
            byParent={byParent}
            matches={matches}
            selection={selection}
          />
        ))}
      </ul>
    </section>
  );
}

function ProjectionNode({
  node,
  byParent,
  matches,
  selection,
}: {
  node: ExplorerElementDto;
  byParent: Map<string | null, ExplorerElementDto[]>;
  matches: (node: ExplorerElementDto) => boolean;
  selection: SelectionState;
}) {
  const children = (byParent.get(node.nodeId) ?? []).filter(matches);
  const kind = node.kind.toLocaleLowerCase();
  const selectable = node.kind === 'CLASS' || node.kind === 'PACKAGE' || node.kind === 'IMPORT_ROOT';
  const selectionType = node.kind === 'IMPORT_ROOT' ? 'import' : node.kind === 'PACKAGE' ? 'package' : 'class';
  const selectionId = node.kind === 'IMPORT_ROOT' ? (node.importId ?? node.elementId) : node.elementId;
  const content = (
    <>
      <span className={`explorer-kind-dot explorer-kind-${kind}`} aria-hidden="true" />
      <span>
        <strong>{node.name}</strong>
        {node.qualifiedName && node.qualifiedName !== node.name ? <small>{node.qualifiedName}</small> : null}
        {node.imported || node.readOnly ? <small>Imported · Read only</small> : null}
      </span>
    </>
  );
  return (
    <li>
      {children.length > 0 ? (
        <details open>
          <summary className={selectable ? 'explorer-projection-summary explorer-projection-summary-selectable' : 'explorer-projection-summary'}>
            {selectable ? (
              <button
                type="button"
                className={selection?.id === selectionId ? 'explorer-tree-label selected' : 'explorer-tree-label'}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  appStoreActions.select({ view: 'class-diagram', type: selectionType, id: selectionId });
                }}
              >{content}</button>
            ) : content}
          </summary>
          <ul>
            {children.map((child) => (
              <ProjectionNode
                key={child.nodeId}
                node={child}
                byParent={byParent}
                matches={matches}
                selection={selection}
              />
            ))}
          </ul>
        </details>
      ) : selectable ? (
        <button
          type="button"
          className={
            selection?.id === selectionId
              ? 'explorer-item explorer-item-selected'
              : 'explorer-item'
          }
          onClick={() =>
            appStoreActions.select({
              view: 'class-diagram',
              type: selectionType,
              id: selectionId,
            })
          }
        >
          {content}
        </button>
      ) : (
        <div className="explorer-item explorer-item-readonly">{content}</div>
      )}
    </li>
  );
}

interface ExplorerItem {
  id: string;
  name: string;
  detail?: string;
  kind: 'class' | 'association' | 'invariant' | 'object' | 'objectLink';
}

function buildItems(activeView: WorkspaceView, project: ProjectDto | null): ExplorerItem[] {
  if (!project) return [];
  if (activeView === 'class-diagram') {
    return [
      ...project.umlModel.classes.map(({ id, name }) => ({ id, name, kind: 'class' as const })),
      ...project.umlModel.associations.map(({ id, name }) => ({
        id,
        name,
        kind: 'association' as const,
      })),
      ...project.umlModel.invariants.map(({ id, name }) => ({
        id,
        name,
        kind: 'invariant' as const,
      })),
    ];
  }
  return [
    ...project.objectModel.objects.map((item) => ({
      id: item.id,
      name: item.displayName ?? item.name,
      detail: project.umlModel.classes.find((candidate) => candidate.id === item.classId)?.name,
      kind: 'object' as const,
    })),
    ...project.objectModel.links.map((item) => ({
      id: item.id,
      name:
        item.name ??
        project.umlModel.associations.find((candidate) => candidate.id === item.associationId)
          ?.name ??
        'Object Link',
      kind: 'objectLink' as const,
    })),
  ];
}

function ExplorerBranch({
  label,
  rootLabel,
  items,
  selection,
  activeView,
  hasQuery,
}: {
  label: string;
  rootLabel: string;
  items: ExplorerItem[];
  selection: SelectionState;
  activeView: WorkspaceView;
  hasQuery: boolean;
}) {
  const groups =
    activeView === 'object-diagram'
      ? [
          { label: 'Objects', kind: 'object' },
          { label: 'Object Links', kind: 'objectLink' },
        ]
      : [
          { label: 'Classes', kind: 'class' },
          { label: 'Associations', kind: 'association' },
          { label: 'Invariants', kind: 'invariant' },
        ];
  return (
    <section className="explorer-model-section">
      <h3>{label}</h3>
      <details open>
        <summary>{rootLabel}</summary>
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.kind === group.kind);
          return (
            <details open key={group.label} className="explorer-group">
              <summary>
                {group.label} <span>{groupItems.length}</span>
              </summary>
              {groupItems.length === 0 ? (
                <p className="explorer-empty">{hasQuery ? 'No matches' : 'Empty'}</p>
              ) : (
                <ul>
                  {groupItems.map((item) => {
                    const selected = selection?.id === item.id && selection.type === item.kind;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={
                            selected ? 'explorer-item explorer-item-selected' : 'explorer-item'
                          }
                          aria-pressed={selected}
                          onClick={() => appStoreActions.select(toSelection(activeView, item))}
                        >
                          <span
                            className={`explorer-kind-dot explorer-kind-${item.kind}`}
                            aria-hidden="true"
                          />
                          <span>
                            <strong>{item.name}</strong>
                            {item.detail ? <small>{item.detail}</small> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>
          );
        })}
      </details>
    </section>
  );
}

function toSelection(activeView: WorkspaceView, item: ExplorerItem): SelectionState {
  if (activeView === 'object-diagram' && (item.kind === 'object' || item.kind === 'objectLink')) {
    return { view: 'object-diagram', type: item.kind, id: item.id };
  }
  if (
    activeView === 'class-diagram' &&
    (item.kind === 'class' || item.kind === 'association' || item.kind === 'invariant')
  ) {
    return { view: 'class-diagram', type: item.kind, id: item.id };
  }
  return null;
}
