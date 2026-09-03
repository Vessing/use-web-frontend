import { describe, expect, it } from 'vitest';
import type { HttpClient } from '../client/httpClient';
import type { OclDefinitionElementDto, UmlAttributeDto, UmlClassDto, UmlInvariantDto, UmlOperationDto } from '../dtos';
import { createModelCommandApi } from './modelCommandApi';

describe('modelCommandApi Association-Class command', () => {
  it('uses the revision-protected aggregate route', async () => {
    const calls: Array<{ path: string; body?: unknown }> = [];
    const client = {
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ path, body }); return {} as TResponse; },
    } as HttpClient;
    const draft: UmlClassDto = { id: 'class-enrollment', name: 'Enrollment', attributes: [], operations: [] };
    const command = { expectedRevision: '18', draft };

    await createModelCommandApi(client).createAssociationClass('project one', 'association/one', command);

    expect(calls).toEqual([{ path: '/projects/project%20one/commands/associations/association%2Fone/association-class', body: command }]);
  });
});

describe('modelCommandApi class command', () => {
  it('uses the revision-protected create route with the complete class draft', async () => {
    const calls: Array<{ path: string; body?: unknown }> = [];
    const client = {
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => {
        calls.push({ path, body });
        return {} as TResponse;
      },
    } as HttpClient;
    const draft: UmlClassDto = { id: 'class/course', name: 'Course', attributes: [], operations: [] };
    const command = { expectedRevision: '18', draft };

    await createModelCommandApi(client).createClass('project one', command);

    expect(calls).toEqual([
      { path: '/projects/project%20one/commands/classes', body: command },
    ]);
  });
});

describe('modelCommandApi F11 invariant commands', () => {
  it('uses revision-protected create and update routes with the complete draft', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = {
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'POST', path, body }); return { command: 'CREATE_INVARIANT', revisionScope: 'MODEL', revision: '19', result: (body as { draft: unknown }).draft, affectedElements: [] } as TResponse; },
      put: async <TResponse, TRequest>(path: string, body: TRequest) => { calls.push({ method: 'PUT', path, body }); return { command: 'UPDATE_INVARIANT', revisionScope: 'MODEL', revision: '20', result: (body as { draft: unknown }).draft, affectedElements: [] } as TResponse; },
    } as HttpClient;
    const draft: UmlInvariantDto = { id: 'inv/adult', name: 'Adult', contextClassId: 'class/person', expression: 'self.age >= 18', enabled: true, description: '' };
    const api = createModelCommandApi(client);

    await api.createInvariant('project one', { expectedRevision: '18', draft });
    await api.updateInvariant('project one', 'inv/adult', { expectedRevision: '19', draft });

    expect(calls).toEqual([
      { method: 'POST', path: '/projects/project%20one/commands/invariants', body: { expectedRevision: '18', draft: { ...draft, expression: { id: 'expr-inv/adult', text: draft.expression, language: 'OCL', languageVersion: '2.4' } } } },
      { method: 'PUT', path: '/projects/project%20one/commands/invariants/inv%2Fadult', body: { expectedRevision: '19', draft: { ...draft, expression: { id: 'expr-inv/adult', text: draft.expression, language: 'OCL', languageVersion: '2.4' } } } },
    ]);
  });
});

describe('modelCommandApi operation commands', () => {
  it('uses revision-protected create and update routes with the complete draft', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = {
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'POST', path, body }); return {} as TResponse; },
      put: async <TResponse, TRequest>(path: string, body: TRequest) => { calls.push({ method: 'PUT', path, body }); return {} as TResponse; },
    } as HttpClient;
    const draft: UmlOperationDto = { id: 'op/quote', name: 'quote', returnType: 'String', visibility: 'PUBLIC', query: true, abstractOperation: false, staticOperation: false, parameters: [{ id: 'param-value', name: 'value', type: 'Integer', direction: 'IN', position: 0 }] };
    const command = { expectedRevision: '18', draft };

    await createModelCommandApi(client).createOperation('project one', 'class/person', command);
    await createModelCommandApi(client).updateOperation('project one', 'class/person', 'op/quote', command);

    expect(calls).toEqual([
      { method: 'POST', path: '/projects/project%20one/commands/classes/class%2Fperson/operations', body: command },
      { method: 'PUT', path: '/projects/project%20one/commands/classes/class%2Fperson/operations/op%2Fquote', body: command },
    ]);
  });

  it('uses the generic B49 impact and delete routes without an owner class field', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = {
      get: async <TResponse>(path: string) => { calls.push({ method: 'GET', path }); return {} as TResponse; },
      delete: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'DELETE', path, body }); return {} as TResponse; },
    } as HttpClient;
    const request = { expectedRevision: '18', cascadeReferenceIds: [] };
    const api = createModelCommandApi(client);

    await api.getDeleteImpact('project one', 'OPERATION', 'op/quote');
    await api.deleteElement('project one', 'OPERATION', 'op/quote', request);

    expect(calls).toEqual([
      { method: 'GET', path: '/projects/project%20one/commands/delete-impact/OPERATION/op%2Fquote' },
      { method: 'DELETE', path: '/projects/project%20one/commands/OPERATION/op%2Fquote', body: request },
    ]);
    expect(calls[1].body).not.toHaveProperty('classId');
  });
});

describe('modelCommandApi F9 commands', () => {
  it('uses revision-protected attribute and definition routes with complete drafts', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = {
      get: async <TResponse>(path: string) => { calls.push({ method: 'GET', path }); return [] as TResponse; },
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'POST', path, body }); return {} as TResponse; },
      put: async <TResponse, TRequest>(path: string, body: TRequest) => { calls.push({ method: 'PUT', path, body }); return {} as TResponse; },
    } as HttpClient;
    const attribute: UmlAttributeDto = { id: 'attr/total', name: 'total', type: 'Real', derived: true, deriveExpression: 'self.lines->sum()', initExpression: null };
    const definition: OclDefinitionElementDto = { id: 'def/name', kind: 'PROPERTY_DEF', ownerKind: 'CLASS', ownerId: 'class/person', ownerName: 'Person', name: 'fullName', qualifiedName: 'Person::fullName', resultType: 'String', parameters: [], expression: 'self.firstName.concat(self.lastName)' };
    const api = createModelCommandApi(client);

    await api.createAttribute('project one', 'class/person', { expectedRevision: '18', draft: attribute });
    await api.updateAttribute('project one', 'class/person', 'attr/total', { expectedRevision: '19', draft: attribute });
    await api.listDefinitions('project one');
    await api.createDefinition('project one', { expectedRevision: '20', draft: definition });
    await api.updateDefinition('project one', 'def/name', { expectedRevision: '21', draft: definition });

    expect(calls).toEqual([
      { method: 'POST', path: '/projects/project%20one/commands/classes/class%2Fperson/attributes', body: { expectedRevision: '18', draft: attribute } },
      { method: 'PUT', path: '/projects/project%20one/commands/classes/class%2Fperson/attributes/attr%2Ftotal', body: { expectedRevision: '19', draft: attribute } },
      { method: 'GET', path: '/projects/project%20one/commands/definitions' },
      { method: 'POST', path: '/projects/project%20one/commands/definitions', body: { expectedRevision: '20', draft: definition } },
      { method: 'PUT', path: '/projects/project%20one/commands/definitions/def%2Fname', body: { expectedRevision: '21', draft: definition } },
    ]);
  });
});

describe('modelCommandApi F10 model type commands', () => {
  it('uses the revision-protected Enumeration and DataType routes', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = { post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'POST', path, body }); return {} as TResponse; }, put: async <TResponse, TRequest>(path: string, body: TRequest) => { calls.push({ method: 'PUT', path, body }); return {} as TResponse; } } as HttpClient;
    const enumeration = { id: 'status', name: 'Status', literals: ['OPEN'], literalDefinitions: [{ id: 'open', name: 'OPEN' }] };
    const dataType = { id: 'money', name: 'Money', properties: [{ id: 'amount', name: 'amount', type: 'Real' }] };
    const api = createModelCommandApi(client);
    await api.createEnumeration('project one', { expectedRevision: '18', draft: enumeration }); await api.updateEnumeration('project one', 'status', { expectedRevision: '19', draft: enumeration }); await api.createDataType('project one', { expectedRevision: '20', draft: dataType }); await api.updateDataType('project one', 'money', { expectedRevision: '21', draft: dataType });
    expect(calls.map((item) => `${item.method} ${item.path}`)).toEqual(['POST /projects/project%20one/commands/enumerations', 'PUT /projects/project%20one/commands/enumerations/status', 'POST /projects/project%20one/commands/datatypes', 'PUT /projects/project%20one/commands/datatypes/money']);
  });

  it('uses the owner-scoped B51 DataType property impact and delete routes', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client = {
      get: async <TResponse>(path: string) => { calls.push({ method: 'GET', path }); return {} as TResponse; },
      delete: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'DELETE', path, body }); return {} as TResponse; },
    } as HttpClient;
    const request = { expectedRevision: '22', cascadeReferenceIds: [] };
    const api = createModelCommandApi(client);

    await api.getDataTypePropertyDeleteImpact('project one', 'money/type', 'currency/code');
    await api.deleteDataTypeProperty('project one', 'money/type', 'currency/code', request);

    expect(calls).toEqual([
      { method: 'GET', path: '/projects/project%20one/commands/datatypes/money%2Ftype/properties/currency%2Fcode/delete-impact' },
      { method: 'DELETE', path: '/projects/project%20one/commands/datatypes/money%2Ftype/properties/currency%2Fcode', body: request },
    ]);
  });
});
