import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ProjectDto, ProjectReadModelDto } from '../../../../api';
import { appStoreActions, getAppState } from '../../../../state';
import { BottomPanel } from '../BottomPanel';
import { ExplorerSidebar } from '../ExplorerSidebar';

describe('F1 workspace shell', () => {
  beforeEach(() => appStoreActions.reset());

  it('filters class diagram elements and synchronizes selection', async () => {
    const user = userEvent.setup();
    render(
      <ExplorerSidebar
        activeView="class-diagram"
        project={project}
        readModel={null}
        isLoading={false}
        error={null}
      />,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search model elements' }), 'person');
    expect(screen.getByRole('button', { name: 'Person' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enrollment' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Person' }));
    expect(getAppState().selection).toEqual({
      view: 'class-diagram',
      type: 'class',
      id: 'class-person',
    });
  });

  it('exposes the four canonical bottom panel tabs and their empty states', async () => {
    const user = userEvent.setup();
    render(<BottomPanel project={project} />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Console',
      'Diagnostics',
      'Validation Results',
      'Invocation Results',
    ]);
    await user.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    expect(screen.getByText('No diagnostics')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Invocation Results' }));
    expect(screen.getByText('No invocation results')).toBeInTheDocument();
  });

  it('supports roving keyboard focus across all bottom panel tabs', async () => {
    const user = userEvent.setup();
    render(<BottomPanel project={project} />);

    const consoleTab = screen.getByRole('tab', { name: 'Console' });
    consoleTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Diagnostics' })).toHaveFocus();
    expect(screen.getByText('No diagnostics')).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Invocation Results' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(consoleTab).toHaveFocus();
  });

  it('renders structured invocation result, out values, lifecycle, and rollback diagnostics', async () => {
    const user = userEvent.setup();
    appStoreActions.setInvocationResult({
      invocationId: 'invoke-1', status: 'ROLLED_BACK',
      receiver: { id: 'object-1', name: 'account1', typeName: 'Account' },
      requestedOperationId: 'operation-base', resolvedOperationId: 'operation-premium',
      resolvedOperationName: 'deposit', resolvedOwnerClassId: 'class-person',
      result: { type: 'Invalid', value: null },
      outValues: [{ parameterId: 'parameter-total', parameterName: 'total', value: { type: 'Integer', value: 120 } }],
      lifecycle: { createdObjects: [], changedObjects: [{ id: 'object-1', name: 'account1', typeName: 'Account' }], deletedObjects: [] },
      beforeSnapshotId: 'snapshot-before', afterSnapshotId: null, candidateAfterSnapshotId: 'snapshot-candidate', revision: 18,
      diagnostics: ['POSTCONDITION_VIOLATION'], contractResults: [{ contractId: 'post-1', contractName: 'BalanceUpdated', kind: 'POST', status: 'VIOLATED', diagnostics: [{ code: 'POSTCONDITION_VIOLATION', severity: 'ERROR', message: 'Expected balance to increase.', sourceRange: { startLine: 2, startColumn: 4, endLine: 2, endColumn: 20 } }] }],
    });
    render(<BottomPanel project={project} />);

    await user.click(screen.getByRole('tab', { name: 'Invocation Results' }));
    expect(screen.getByText('ROLLED_BACK')).toBeInTheDocument();
    expect(screen.getByText('invalid')).toBeInTheDocument();
    expect(screen.getByText('120 : Integer')).toBeInTheDocument();
    expect(screen.getAllByText('POSTCONDITION_VIOLATION')).toHaveLength(2);
    expect(screen.getByText('BalanceUpdated')).toBeInTheDocument();
    expect(screen.getByText('Candidate After')).toBeInTheDocument();
    expect(screen.getByText('Discarded and not persisted')).toBeInTheDocument();
    expect(screen.getByText('Source 2:4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open postcondition' }));
    expect(getAppState().selection).toEqual({ view: 'class-diagram', type: 'class', id: 'class-person' });
  });

  it('explains a blocked precondition without presenting an after state', async () => {
    appStoreActions.setInvocationResult({
      invocationId: 'invoke-blocked', status: 'BLOCKED', receiver: { id: 'object-1', name: 'account1', typeName: 'Account' },
      requestedOperationId: 'operation-base', resolvedOperationId: 'operation-base', resolvedOperationName: 'withdraw', resolvedOwnerClassId: 'class-person',
      result: null, outValues: [], lifecycle: { createdObjects: [], changedObjects: [], deletedObjects: [] }, beforeSnapshotId: 'snapshot-before', afterSnapshotId: null, candidateAfterSnapshotId: null, revision: 18, diagnostics: [],
      contractResults: [{ contractId: 'pre-1', contractName: 'EnoughFunds', kind: 'PRE', status: 'VIOLATED', diagnostics: [] }],
    });
    render(<BottomPanel project={project} />);
    expect(screen.getByText('Operation body was not executed')).toBeInTheDocument();
    expect(screen.getByText('The condition was false in the Before state. The operation body was not executed.')).toBeInTheDocument();
  });

  it('selects import roots and marks imported classifiers read-only', async () => {
    const user = userEvent.setup();
    render(<ExplorerSidebar activeView="class-diagram" project={project} readModel={readModel} isLoading={false} error={null} />);

    expect(screen.getAllByText('Imported · Read only')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'shared::core Imported · Read only' }));
    expect(getAppState().selection).toEqual({ view: 'class-diagram', type: 'import', id: 'import-core' });
  });
});

const readModel: ProjectReadModelDto = {
  projectId: 'project-university', modelId: 'model-university', snapshotId: null,
  readVersion: 'revision-18', capabilities: {}, diagnostics: [], classes: [],
  explorer: [
    { nodeId: 'root', elementId: 'root', parentNodeId: null, name: 'Project root', qualifiedName: 'Project root', kind: 'PROJECT_ROOT', imported: false, readOnly: false },
    { nodeId: 'import-root', elementId: 'import-core', parentNodeId: null, name: 'shared::core', qualifiedName: 'shared::core', kind: 'IMPORT_ROOT', imported: true, readOnly: true, importId: 'import-core', provenance: 'shared.use' },
    { nodeId: 'identifier', elementId: 'class-identifier', parentNodeId: 'import-root', name: 'Identifier', qualifiedName: 'shared::core::Identifier', kind: 'CLASS', imported: true, readOnly: true, importId: 'import-core' },
  ],
};

const project: ProjectDto = {
  formatVersion: '1.0',
  project: { id: 'project-university', name: 'University' },
  umlModel: {
    classes: [{ id: 'class-person', name: 'Person', attributes: [], operations: [] }],
    associations: [{ id: 'association-enrollment', name: 'Enrollment', ends: [] }],
    invariants: [
      {
        id: 'invariant-name',
        name: 'HasName',
        contextClassId: 'class-person',
        expression: 'not name.isEmpty()',
      },
    ],
  },
  objectModel: { objects: [], links: [] },
  layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
};
