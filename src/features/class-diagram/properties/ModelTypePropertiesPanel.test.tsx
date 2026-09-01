import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modelCommandApi, type ProjectDto } from '../../../api';
import { appStoreActions, getAppState } from '../../../state';
import { DataTypePropertiesPanel, EnumerationPropertiesPanel } from './ModelTypePropertiesPanel';

describe('F10 model type properties', () => {
  beforeEach(() => {
    appStoreActions.reset();
    vi.restoreAllMocks();
  });
  it('saves stable ordered Enumeration literals and reloads', async () => {
    const user = userEvent.setup(); const update = vi.spyOn(modelCommandApi, 'updateEnumeration').mockResolvedValue({ command: 'UPDATE_ENUMERATION', revisionScope: 'MODEL', revision: '19', result: enumeration, affectedElements: [] }); const refresh = vi.fn().mockResolvedValue(true);
    render(<EnumerationPropertiesPanel project={project} enumeration={enumeration} revision="18" onRefreshProject={refresh} />);
    fireEvent.change(screen.getByLabelText('Literal 1'), { target: { value: 'READY' } }); await user.click(screen.getByRole('button', { name: 'Move READY later' })); await user.click(screen.getByRole('button', { name: 'Save Enumeration' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('project', 'status', { expectedRevision: '18', draft: expect.objectContaining({ literalDefinitions: [{ id: 'closed', name: 'CLOSED' }, { id: 'open', name: 'READY' }] }) })); expect(refresh).toHaveBeenCalled();
  });

  it('uses the shared Type Picker for DataType properties', async () => {
    const user = userEvent.setup(); const update = vi.spyOn(modelCommandApi, 'updateDataType').mockResolvedValue({ command: 'UPDATE_DATATYPE', revisionScope: 'MODEL', revision: '20', result: dataType, affectedElements: [] });
    render(<DataTypePropertiesPanel project={project} dataType={dataType} revision="19" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await user.selectOptions(screen.getByLabelText('Property type'), 'Integer'); await user.click(screen.getByRole('button', { name: 'Save DataType' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('project', 'money', { expectedRevision: '19', draft: expect.objectContaining({ properties: [expect.objectContaining({ type: 'Integer' })] }) }));
  });

  it('opens dedicated whole and literal delete commands without discarding the local Enumeration draft', async () => {
    const user = userEvent.setup();
    render(<EnumerationPropertiesPanel project={project} enumeration={enumeration} revision="19" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await user.clear(screen.getByLabelText('Literal 1'));
    await user.type(screen.getByLabelText('Literal 1'), 'READY');

    await user.click(screen.getByRole('button', { name: 'Delete literal READY' }));
    expect(getAppState().modal).toMatchObject({ type: 'deleteModelTypeElement', targetKind: 'ENUMERATION_LITERAL', elementId: 'open', ownerId: 'status' });
    appStoreActions.closeModal();
    expect(screen.getByLabelText('Literal 1')).toHaveValue('READY');

    await user.click(screen.getByRole('button', { name: 'Delete Enumeration' }));
    expect(getAppState().modal).toMatchObject({ type: 'deleteModelTypeElement', targetKind: 'ENUMERATION', elementId: 'status' });
  });

  it('opens dedicated whole and property delete commands while new properties remain local', async () => {
    const user = userEvent.setup();
    render(<DataTypePropertiesPanel project={project} dataType={dataType} revision="19" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await user.click(screen.getByRole('button', { name: 'Delete value property amount' }));
    expect(getAppState().modal).toMatchObject({ type: 'deleteModelTypeElement', targetKind: 'DATATYPE_PROPERTY', elementId: 'amount', ownerId: 'money' });
    appStoreActions.closeModal();

    await user.click(screen.getByRole('button', { name: 'Add Value Property' }));
    expect(screen.getByRole('button', { name: 'Remove new value property 2' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Delete DataType' }));
    expect(getAppState().modal).toMatchObject({ type: 'deleteModelTypeElement', targetKind: 'DATATYPE', elementId: 'money' });
  });
});

const enumeration = { id: 'status', name: 'Status', literals: ['OPEN', 'CLOSED'], literalDefinitions: [{ id: 'open', name: 'OPEN' }, { id: 'closed', name: 'CLOSED' }] };
const dataType = { id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }] };
const project: ProjectDto = { formatVersion: '1', project: { id: 'project', name: 'Types' }, umlModel: { primitiveTypes: ['String', 'Integer', 'Real', 'Boolean'], classes: [], associations: [], invariants: [], enumerations: [enumeration], dataTypes: [dataType] }, objectModel: { objects: [], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
