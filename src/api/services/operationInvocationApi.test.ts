import { describe, expect, it } from 'vitest';

import type { HttpClient } from '../client/httpClient';
import { createOperationInvocationApi } from './operationInvocationApi';

describe('operationInvocationApi', () => {
  it('sends receiver, stable parameter ids, typed values, and revision', async () => {
    const calls: Array<{ path: string; body?: unknown }> = [];
    const client = { post: async <TResponse, TRequest>(path: string, body?: TRequest) => { calls.push({ path, body }); return {} as TResponse; } } as HttpClient;
    const request = { receiverObjectId: 'object-1', operationId: 'operation/quote', expectedRevision: 18, arguments: [{ parameterId: 'parameter-value', value: { type: 'Integer', value: 4 } }] };

    await createOperationInvocationApi(client).invoke('project one', 'operation/quote', request);

    expect(calls).toEqual([{ path: '/projects/project%20one/operations/operation%2Fquote/invocations', body: request }]);
  });
});
