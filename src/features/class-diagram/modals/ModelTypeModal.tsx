import { useState, type FormEvent } from 'react';
import { ApiClientError, modelCommandApi, type ProjectDto } from '../../../api';
import { appStoreActions } from '../../../state';
import { TypePicker } from '../properties/TypePicker';

export function ModelTypeModal({
  kind,
  project,
  expectedRevision,
  onRefreshProject,
}: {
  kind: 'enumeration' | 'dataType';
  project: ProjectDto;
  expectedRevision: string;
  onRefreshProject: () => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [packageId, setPackageId] = useState('');
  const [literals, setLiterals] = useState([{ id: `literal-${crypto.randomUUID()}`, name: '' }]);
  const [properties, setProperties] = useState([
    { id: `property-${crypto.randomUUID()}`, name: '', type: 'String' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueLiterals =
    new Set(literals.map((item) => item.name.trim().toLocaleLowerCase())).size === literals.length;
  const valid =
    Boolean(expectedRevision && name.trim()) &&
    (kind === 'enumeration'
      ? literals.length > 0 && literals.every((item) => item.name.trim()) && uniqueLiterals
      : properties.every((item) => item.name.trim() && item.type));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = `${kind}-${crypto.randomUUID()}`;
      const result =
        kind === 'enumeration'
          ? await modelCommandApi.createEnumeration(project.project.id, {
              expectedRevision,
              draft: {
                id,
                name: name.trim(),
                packageId: packageId || null,
                literals: literals.map((item) => item.name.trim()),
                literalDefinitions: literals.map((item) => ({ ...item, name: item.name.trim() })),
              },
            })
          : await modelCommandApi.createDataType(project.project.id, {
              expectedRevision,
              draft: { id, name: name.trim(), packageId: packageId || null, properties },
            });
      if (!(await onRefreshProject()))
        throw new Error(`The authoritative ${kind} projection could not be reloaded.`);
      appStoreActions.select({
        view: 'class-diagram',
        type: kind === 'enumeration' ? 'enumeration' : 'dataType',
        id: result.result.id,
      });
      appStoreActions.closeModal();
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? `${cause.dto.code}: ${cause.dto.userMessage ?? cause.dto.message}`
          : cause instanceof Error
            ? cause.message
            : 'The command failed.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-type-modal-title"
        onSubmit={submit}
      >
        <header className="modal-header">
          <h2 id="model-type-modal-title">
            Create {kind === 'enumeration' ? 'Enumeration' : 'DataType'}
          </h2>
          <button type="button" className="icon-button" onClick={appStoreActions.closeModal}>
            Close
          </button>
        </header>
        <div className="modal-body">
          <label className="modal-field">
            <span>Name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="modal-field">
            <span>Package</span>
            <select value={packageId} onChange={(event) => setPackageId(event.target.value)}>
              <option value="">Project root</option>
              {(project.umlModel.packages ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.qualifiedName}
                </option>
              ))}
            </select>
          </label>
          {kind === 'enumeration' ? (
            <section>
              <h3>Ordered Literals</h3>
              {literals.map((item, index) => (
                <div className="structured-list-row" key={item.id}>
                  <input
                    aria-label={`Literal ${index + 1}`}
                    value={item.name}
                    onChange={(event) =>
                      setLiterals((current) =>
                        current.map((literal) =>
                          literal.id === item.id
                            ? { ...literal, name: event.target.value }
                            : literal,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLiterals((current) => current.filter((literal) => literal.id !== item.id))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setLiterals((current) => [
                    ...current,
                    { id: `literal-${crypto.randomUUID()}`, name: '' },
                  ])
                }
              >
                Add Literal
              </button>
            </section>
          ) : (
            <section>
              <h3>Value Properties</h3>
              {properties.map((item, index) => (
                <div className="datatype-property-editor" key={item.id}>
                  <label className="modal-field">
                    <span>Property {index + 1}</span>
                    <input
                      value={item.name}
                      onChange={(event) =>
                        setProperties((current) =>
                          current.map((property) =>
                            property.id === item.id
                              ? { ...property, name: event.target.value }
                              : property,
                          ),
                        )
                      }
                    />
                  </label>
                  <TypePicker
                    project={project}
                    label="Property type"
                    value={item.type}
                    allowStructured
                    onChange={(type) =>
                      setProperties((current) =>
                        current.map((property) =>
                          property.id === item.id ? { ...property, type } : property,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setProperties((current) =>
                        current.filter((property) => property.id !== item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setProperties((current) => [
                    ...current,
                    { id: `property-${crypto.randomUUID()}`, name: '', type: 'String' },
                  ])
                }
              >
                Add Value Property
              </button>
            </section>
          )}
          {error ? (
            <p className="modal-form-error" role="alert">
              {error}
            </p>
          ) : null}
          {!expectedRevision ? (
            <p className="modal-form-error">A model revision is required.</p>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={appStoreActions.closeModal}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!valid || busy}>
            {busy ? 'Creating...' : `Create ${kind === 'enumeration' ? 'Enumeration' : 'DataType'}`}
          </button>
        </footer>
      </form>
    </div>
  );
}
