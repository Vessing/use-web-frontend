import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { OclComplianceProfileDto } from '../../../api';
import { OclComplianceProfile } from '../components/OclComplianceProfile';

describe('OclComplianceProfile', () => {
  it('shows every backend status, profile identity, search and runtime limits', async () => {
    const user = userEvent.setup();
    render(<OclComplianceProfile loadProfile={vi.fn(async () => profile())} />);

    await user.click(await screen.findByRole('button', { name: 'OCL 2.4 · Subset' }));
    expect(screen.getByText('use-web-ocl-2.4-subset-v3')).toBeInTheDocument();
    expect(screen.getAllByText('Supported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partial').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not Supported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Out Of Scope').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('Search features'), 'OclMessage');
    expect(screen.getByRole('button', { name: /OclMessage/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Core expressions/ })).not.toBeInTheDocument();

    await user.click(screen.getByText('Engine details'));
    expect(screen.getByText('maxTokens')).toBeInTheDocument();
    expect(screen.getByText(/10[.,]000/)).toBeInTheDocument();
  });

  it('keeps support unverified on failure and retries the real loader', async () => {
    const user = userEvent.setup();
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('Profile endpoint offline.'))
      .mockResolvedValueOnce(profile());
    render(<OclComplianceProfile loadProfile={load} />);

    await user.click(await screen.findByRole('button', { name: 'OCL support unavailable' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Profile endpoint offline.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('use-web-ocl-2.4-subset-v3')).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);
  });
});

function profile(): OclComplianceProfileDto {
  return {
    profileId: 'use-web-ocl-2.4-subset-v3',
    oclVersion: '2.4',
    complianceClaim: 'OCL 2.4-based subset; no full compliance claim',
    apiVersion: 'v1',
    enabledOptionalCompliancePoints: ['allInstances'],
    features: [
      { id: 'OCL-PROFILE-001', group: 'Core expressions', status: 'SUPPORTED', standardBasis: 'Clauses 8-10', notes: 'Core expressions.' },
      { id: 'OCL-PROFILE-007', group: 'Model navigation', status: 'PARTIAL', standardBasis: 'Clauses 8-10', notes: 'Available with documented limits.' },
      { id: 'OCL-PROFILE-012', group: 'OclMessage', status: 'NOT_SUPPORTED', standardBasis: 'Optional point', notes: 'Not implemented.' },
      { id: 'OCL-PROFILE-016', group: 'State machines', status: 'OUT_OF_SCOPE', standardBasis: 'Behavioral UML', notes: 'Outside the product profile.' },
    ],
    runtimeLimits: { maxTokens: 10000 },
  };
}
