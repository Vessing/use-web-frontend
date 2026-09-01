import { describe, expect, it } from 'vitest';

import type { HttpClient } from '../client/httpClient';
import { createOclApi } from './oclApi';

describe('oclApi F11 compliance profile', () => {
  it('loads the backend-published API-v1 profile without a client fallback', async () => {
    const paths: string[] = [];
    const client = { get: async <TResponse>(path: string) => { paths.push(path); return {} as TResponse; } } as HttpClient;

    await createOclApi(client).getComplianceProfile();

    expect(paths).toEqual(['/ocl/profile']);
  });
});
