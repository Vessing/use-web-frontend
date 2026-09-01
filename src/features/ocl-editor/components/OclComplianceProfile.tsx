import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  oclApi,
  type OclComplianceProfileDto,
  type OclFeatureStatusDto,
} from '../../../api';

interface OclComplianceProfileProps {
  loadProfile?: typeof oclApi.getComplianceProfile;
  requestedFeatureId?: string | null;
  onRequestedFeatureHandled?: () => void;
}

const statuses: OclFeatureStatusDto[] = [
  'SUPPORTED',
  'PARTIAL',
  'NOT_SUPPORTED',
  'OUT_OF_SCOPE',
];

export function OclComplianceProfile({
  loadProfile = oclApi.getComplianceProfile,
  requestedFeatureId = null,
  onRequestedFeatureHandled,
}: OclComplianceProfileProps) {
  const [profile, setProfile] = useState<OclComplianceProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loadProfile();
      assertTrustworthyProfile(response);
      setProfile(response);
      setSelectedFeatureId((current) =>
        response.features.some((feature) => feature.id === current)
          ? current
          : response.features[0]?.id ?? null,
      );
    } catch (caught) {
      setProfile(null);
      setError(caught instanceof Error ? caught.message : 'The OCL profile could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!requestedFeatureId) return;
    setIsOpen(true);
    setSelectedFeatureId(requestedFeatureId);
    setQuery(requestedFeatureId);
    onRequestedFeatureHandled?.();
  }, [onRequestedFeatureHandled, requestedFeatureId]);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  const filteredFeatures = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return profile?.features ?? [];
    return (profile?.features ?? []).filter((feature) =>
      [feature.id, feature.group, feature.status, feature.standardBasis, feature.notes]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [profile, query]);

  const selectedFeature = profile?.features.find(
    (feature) => feature.id === selectedFeatureId,
  ) ?? filteredFeatures[0] ?? null;

  function closeDialog() {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="ocl-profile-trigger"
        disabled={isLoading}
        aria-haspopup="dialog"
        aria-busy={isLoading}
        onClick={() => setIsOpen(true)}
      >
        {isLoading
          ? 'Loading OCL support...'
          : profile
            ? `OCL ${profile.oclVersion} · Subset`
            : 'OCL support unavailable'}
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}>
          <section
            className="modal-dialog ocl-profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocl-profile-title"
          >
            <header className="modal-header">
              <div>
                <h2 id="ocl-profile-title">OCL language support</h2>
                <p>Backend-published OCL 2.4 subset and runtime limits.</p>
              </div>
              <button ref={closeRef} type="button" className="icon-button" onClick={closeDialog}>
                Close
              </button>
            </header>

            <div className="modal-body ocl-profile-body">
              {isLoading ? <ProfileState kind="loading" title="Loading support profile" detail="Reading the current profile from the backend." /> : null}
              {error ? (
                <ProfileState kind="error" title="Support status is unavailable" detail={error}>
                  <button type="button" onClick={() => void fetchProfile()}>Retry</button>
                </ProfileState>
              ) : null}
              {profile ? (
                <>
                  <section className="ocl-profile-identity" aria-label="Profile identity">
                    <div><span>Profile</span><strong>{profile.profileId}</strong></div>
                    <div><span>OCL</span><strong>{profile.oclVersion}</strong></div>
                    <div><span>API</span><strong>{profile.apiVersion}</strong></div>
                    <p>{profile.complianceClaim}</p>
                  </section>

                  <dl className="ocl-profile-counts" aria-label="Feature status summary">
                    {statuses.map((status) => (
                      <div key={status} data-status={status}>
                        <dt>{formatStatus(status)}</dt>
                        <dd>{profile.features.filter((feature) => feature.status === status).length}</dd>
                      </div>
                    ))}
                  </dl>

                  <label className="ocl-profile-search">
                    <span>Search features</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Feature, ID, status or standard basis"
                    />
                  </label>

                  <div className="ocl-profile-feature-layout">
                    {filteredFeatures.length ? (
                      <ul className="ocl-profile-feature-list" aria-label="OCL features">
                        {filteredFeatures.map((feature) => (
                          <li key={feature.id}>
                            <button
                              type="button"
                              aria-pressed={selectedFeature?.id === feature.id}
                              onClick={() => setSelectedFeatureId(feature.id)}
                            >
                              <span className={`ocl-feature-status ocl-feature-${feature.status.toLocaleLowerCase()}`}>
                                {formatStatus(feature.status)}
                              </span>
                              <strong>{feature.group}</strong>
                              <small>{feature.id}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ProfileState kind="empty" title="No matching features" detail="Change the search text to inspect another backend-published feature." />
                    )}
                    {selectedFeature ? (
                      <section className="ocl-profile-feature-detail" aria-live="polite">
                        <span className={`ocl-feature-status ocl-feature-${selectedFeature.status.toLocaleLowerCase()}`}>
                          {formatStatus(selectedFeature.status)}
                        </span>
                        <h3>{selectedFeature.group}</h3>
                        <p className="ocl-profile-feature-id">{selectedFeature.id}</p>
                        <dl>
                          <div><dt>Standard basis</dt><dd>{selectedFeature.standardBasis}</dd></div>
                          <div><dt>{selectedFeature.status === 'PARTIAL' ? 'Available scope and limit' : 'Backend notes'}</dt><dd>{selectedFeature.notes}</dd></div>
                        </dl>
                      </section>
                    ) : null}
                  </div>

                  <details className="ocl-profile-engine-details">
                    <summary>Engine details</summary>
                    <h3>Optional compliance points</h3>
                    <p>{profile.enabledOptionalCompliancePoints.join(', ') || 'None enabled'}</p>
                    <h3>Runtime limits</h3>
                    <dl>
                      {Object.entries(profile.runtimeLimits).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => (
                        <div key={name}><dt>{name}</dt><dd>{value.toLocaleString()}</dd></div>
                      ))}
                    </dl>
                  </details>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ProfileState({ kind, title, detail, children }: { kind: string; title: string; detail: string; children?: ReactNode }) {
  return <div className={`ocl-profile-state ocl-profile-state-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><strong>{title}</strong><span>{detail}</span>{children}</div>;
}

function formatStatus(status: OclFeatureStatusDto) {
  return status.split('_').map((part) => part.charAt(0) + part.slice(1).toLocaleLowerCase()).join(' ');
}

function assertTrustworthyProfile(profile: OclComplianceProfileDto) {
  if (!profile.profileId?.trim() || !profile.oclVersion?.trim() || !profile.apiVersion?.trim()) {
    throw new Error('The backend returned an incomplete OCL profile identity.');
  }
  if (!Array.isArray(profile.features) || profile.features.length === 0) {
    throw new Error('The backend returned an empty OCL feature list.');
  }
  if (profile.features.some((feature) => !statuses.includes(feature.status))) {
    throw new Error('The backend returned an unknown OCL feature status.');
  }
}
