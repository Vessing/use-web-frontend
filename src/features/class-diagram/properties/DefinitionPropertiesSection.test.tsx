import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, modelCommandApi, type ProjectDto } from '../../../api';
import { DefinitionPropertiesSection } from './DefinitionPropertiesSection';

afterEach(() => vi.restoreAllMocks());

describe('DefinitionPropertiesSection', () => {
  it('creates a class operation definition with ordered parameters and reloads the projection', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createDefinition').mockResolvedValue({ command: 'CREATE_DEFINITION', revisionScope: 'MODEL', revision: '19', result: definition, affectedElements: [] });
    render(<DefinitionPropertiesSection project={emptyProject} ownerKind="CLASS" ownerId="class-account" ownerName="Account" revision="18" onRefreshProject={refresh} />);

    await user.selectOptions(screen.getByLabelText('Definition kind'), 'OPERATION_DEF');
    await user.type(screen.getByLabelText('Definition name'), 'adjusted');
    await user.clear(screen.getByLabelText('Result type'));
    await user.type(screen.getByLabelText('Result type'), 'Integer');
    await user.click(screen.getByRole('button', { name: 'Add Parameter' }));
    await user.type(screen.getByLabelText('Definition parameter 1 name'), 'amount');
    await user.type(screen.getByLabelText('OCL expression'), 'self.balance + amount');
    await user.click(screen.getByRole('button', { name: 'Create Definition' }));

    expect(create).toHaveBeenCalledWith('project-1', expect.objectContaining({ expectedRevision: '18', draft: expect.objectContaining({ kind: 'OPERATION_DEF', ownerKind: 'CLASS', ownerId: 'class-account', qualifiedName: 'Account::adjusted', parameters: [expect.objectContaining({ name: 'amount', position: 0 })], expression: 'self.balance + amount' }) }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Definition saved at model revision 19.')).toBeInTheDocument();
  });

  it('retains a rejected definition expression and preserves its diagnostic target', async () => {
    const user = userEvent.setup();
    vi.spyOn(modelCommandApi, 'updateDefinition').mockRejectedValue(new ApiClientError(409, { code: 'DEFINITION_COMPILE_CONFLICT', message: 'invalid', userMessage: 'Unknown property.', timestamp: '2026-08-31', details: { field: 'expression' } }));
    render(<DefinitionPropertiesSection project={project} ownerKind="CLASS" ownerId="class-account" ownerName="Account" revision="18" onRefreshProject={vi.fn()} />);

    await user.clear(screen.getByLabelText('OCL expression'));
    await user.type(screen.getByLabelText('OCL expression'), 'self.missing');
    await user.click(screen.getByRole('button', { name: 'Save Definition' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('DEFINITION_COMPILE_CONFLICT');
    expect(screen.getByLabelText(/OCL expression/)).toHaveValue('self.missing');
    expect(screen.getByLabelText(/OCL expression/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('loads delete impact and deletes an unreferenced definition with its revision', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(true);
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue({ revisionScope: 'MODEL', revision: '18', blocked: false, target: { referenceId: 'target', elementType: 'DEFINITION', elementId: 'definition-adjusted', elementName: 'adjusted', relation: 'TARGET', cascadeAllowed: false }, references: [] });
    const remove = vi.spyOn(modelCommandApi, 'deleteElement').mockResolvedValue({ command: 'DELETE_DEFINITION', revisionScope: 'MODEL', revision: '19', result: null, affectedElements: [] });
    render(<DefinitionPropertiesSection project={project} ownerKind="CLASS" ownerId="class-account" ownerName="Account" revision="18" onRefreshProject={refresh} />);

    await user.click(screen.getByRole('button', { name: 'Delete Definition' }));
    await user.click((await screen.findAllByRole('button', { name: 'Delete Definition' })).at(-1)!);

    expect(remove).toHaveBeenCalledWith('project-1', 'DEFINITION', 'definition-adjusted', { expectedRevision: '18', cascadeReferenceIds: [] });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Definition deleted at model revision 19.')).toBeInTheDocument();
  });
});

const definition = { id: 'definition-adjusted', kind: 'OPERATION_DEF' as const, ownerKind: 'CLASS' as const, ownerId: 'class-account', ownerName: 'Account', name: 'adjusted', qualifiedName: 'Account::adjusted', resultType: 'Integer', parameters: [{ id: 'parameter-amount', name: 'amount', type: 'Integer', direction: 'IN' as const, position: 0 }], expression: 'self.balance + amount', sourceRange: null };
const emptyProject: ProjectDto = { formatVersion: '1', project: { id: 'project-1', name: 'Accounts' }, definitions: [], umlModel: { classes: [{ id: 'class-account', name: 'Account', attributes: [], operations: [] }], associations: [], invariants: [] }, objectModel: { objects: [], links: [] }, layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } } };
const project: ProjectDto = { ...emptyProject, definitions: [definition] };
