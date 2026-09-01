import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { operationInvocationApi, type OperationInvocationResultDto, type ProjectDto, type ProjectReadModelDto } from '../../../api';
import { appStoreActions, getAppState } from '../../../state';
import { OperationInvocationPanel } from './OperationInvocationPanel';

beforeEach(() => appStoreActions.reset());
afterEach(() => vi.restoreAllMocks());

describe('OperationInvocationPanel', () => {
  it('invokes with stable parameter ids, reloads on success, and publishes the result', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const invoke = vi.spyOn(operationInvocationApi, 'invoke').mockResolvedValue(result);
    render(<OperationInvocationPanel project={project} object={project.objectModel.objects[0]} readModel={readModel} readVersion="18" onRefreshProject={refresh} />);

    await user.type(screen.getByLabelText(/^amount : Integer \(in\)/), '20');
    await user.click(screen.getByRole('button', { name: 'Invoke Operation' }));

    expect(invoke).toHaveBeenCalledWith('project-1', 'operation-deposit', { receiverObjectId: 'object-account', operationId: 'operation-deposit', expectedRevision: 18, arguments: [{ parameterId: 'parameter-amount', value: { type: 'Integer', value: 20 } }] });
    expect(refresh).toHaveBeenCalled();
    expect(getAppState().invocationResult?.status).toBe('SUCCEEDED');
    expect(getAppState().activeBottomPanelTab).toBe('invocation-results');
  });
});

const project: ProjectDto = { formatVersion: '1', project: { id: 'project-1', name: 'Accounts' }, umlModel: { classes: [{ id: 'class-account', name: 'Account', attributes: [], operations: [{ id: 'operation-deposit', name: 'deposit', returnType: 'Boolean', query: true, parameters: [{ id: 'parameter-amount', name: 'amount', type: 'Integer', direction: 'IN', position: 0 }] }] }], associations: [], invariants: [] }, objectModel: { id: 'snapshot-before', objects: [{ id: 'object-account', name: 'account1', classId: 'class-account', slots: [] }], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
const readModel: ProjectReadModelDto = { projectId: 'project-1', modelId: 'model-1', readVersion: '18', capabilities: {}, explorer: [], diagnostics: [], classes: [{ id: 'class-account', name: 'Account', qualifiedName: 'Account', abstractClass: false, directSuperClasses: [], generalizationOrder: [], attributes: [], operations: [{ id: 'operation-deposit', name: 'deposit', qualifiedName: 'Account::deposit', kind: 'OPERATION', type: 'Boolean', definingClassifier: { id: 'class-account', name: 'Account', qualifiedName: 'Account', kind: 'CLASS' }, inherited: false, derived: false, readOnly: false, staticFeature: false, redefinedFeatures: [] }] }], snapshotId: 'snapshot-before' };
const result: OperationInvocationResultDto = { invocationId: 'invoke-1', status: 'SUCCEEDED', receiver: { id: 'object-account', name: 'account1', typeName: 'Account' }, requestedOperationId: 'operation-deposit', resolvedOperationId: 'operation-deposit', resolvedOperationName: 'deposit', resolvedOwnerClassId: 'class-account', result: { type: 'Boolean', value: true }, outValues: [], lifecycle: { createdObjects: [], changedObjects: [], deletedObjects: [] }, beforeSnapshotId: 'snapshot-before', afterSnapshotId: 'snapshot-after', candidateAfterSnapshotId: 'snapshot-after', revision: 19, diagnostics: [], contractResults: [] };
