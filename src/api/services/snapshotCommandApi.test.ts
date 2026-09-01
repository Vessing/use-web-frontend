import { describe, expect, it } from 'vitest';
import type { HttpClient } from '../client/httpClient';
import type { ObjectLinkDto } from '../dtos';
import { createSnapshotCommandApi } from './snapshotCommandApi';

describe('snapshotCommandApi', () => {
  it('uses only revision-protected object-link command routes', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const client: HttpClient = {
      get: async <TResponse>(path: string) => { calls.push({ method: 'GET', path }); return { revisionScope: 'SNAPSHOT', revision: '18', target: {}, currentLink: draft, context: [], blockers: [], allowedCascades: [], validationTargets: [], blocked: false } as TResponse; },
      post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'POST', path, body }); return { result: draft } as TResponse; },
      put: async <TResponse, TRequest>(path: string, body: TRequest) => { calls.push({ method: 'PUT', path, body }); return { result: draft } as TResponse; },
      delete: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ method: 'DELETE', path, body }); return { result: null } as TResponse; },
    };
    const api = createSnapshotCommandApi(client);
    const command = { expectedRevision: '18', draft };

    await api.createObjectLink('project one', command);
    await api.updateObjectLink('project one', 'link/one', command);
    const aggregateCommand = { expectedRevision: '18', draft: { link: draft, associationClassObject: { id: 'object-one', name: 'identity', classId: 'class-one', slots: [] } } };
    await api.createAssociationClassInstance('project one', aggregateCommand);
    await api.updateAssociationClassInstance('project one', 'link/one', aggregateCommand);
    await api.getObjectLinkDeleteImpact('project one', 'link/one');
    await api.deleteObjectLink('project one', 'link/one', { expectedRevision: '18', cascadeReferenceIds: ['cascade-1'] });
    await api.createObject('project one', { expectedRevision: '18', draft: { id: 'object-one', name: 'one', classId: 'class-one', slots: [] } });
    await api.updateSlot('project one', 'object-one', 'slot/one', { expectedRevision: '19', draft: { id: 'slot/one', attributeId: 'attribute-one', value: { type: 'Integer', value: 4 }, isUnset: false } });

    expect(calls).toEqual([
      { method: 'POST', path: '/projects/project%20one/commands/object-model/links', body: command },
      { method: 'PUT', path: '/projects/project%20one/commands/object-model/links/link%2Fone', body: command },
      { method: 'POST', path: '/projects/project%20one/commands/object-model/association-class-instances', body: aggregateCommand },
      { method: 'PUT', path: '/projects/project%20one/commands/object-model/association-class-instances/link%2Fone', body: aggregateCommand },
      { method: 'GET', path: '/projects/project%20one/commands/object-model/links/link%2Fone/delete-impact' },
      { method: 'DELETE', path: '/projects/project%20one/commands/object-model/links/link%2Fone', body: { expectedRevision: '18', cascadeReferenceIds: ['cascade-1'] } },
      { method: 'POST', path: '/projects/project%20one/commands/object-model/objects', body: { expectedRevision: '18', draft: { id: 'object-one', name: 'one', classId: 'class-one', slots: [] } } },
      { method: 'PUT', path: '/projects/project%20one/commands/object-model/objects/object-one/slots/slot%2Fone', body: { expectedRevision: '19', draft: { id: 'slot/one', attributeId: 'attribute-one', value: { type: 'Integer', value: 4 }, isUnset: false } } },
    ]);
  });
});

const draft: ObjectLinkDto = { id: 'link-one', associationId: 'association-one', endValues: [{ associationEndId: 'end-one', objectId: 'object-one', qualifierValues: [] }] };
