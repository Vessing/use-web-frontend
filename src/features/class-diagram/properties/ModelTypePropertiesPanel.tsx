import { useEffect, useMemo, useState } from 'react';
import {
  ApiClientError,
  modelCommandApi,
  type ProjectDto,
  type UmlDataTypeDto,
  type UmlEnumerationDto,
} from '../../../api';
import { appStoreActions } from '../../../state';
import { TypePicker } from './TypePicker';

type Common = { project: ProjectDto; revision: string; onRefreshProject: () => Promise<boolean> };

export function EnumerationPropertiesPanel({
  project,
  enumeration,
  revision,
  onRefreshProject,
}: Common & { enumeration: UmlEnumerationDto }) {
  const initial = useMemo(() => normalizeEnumeration(enumeration), [enumeration]);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setDraft(initial), [initial]);
  const persistedLiteralIds = useMemo(
    () => new Set(initial.literalDefinitions!.map((item) => item.id)),
    [initial],
  );
  const duplicate =
    new Set(draft.literalDefinitions!.map((item) => item.name.trim().toLocaleLowerCase())).size !==
    draft.literalDefinitions!.length;
  const save = async () => {
    if (
      !revision ||
      busy ||
      !draft.name.trim() ||
      duplicate ||
      draft.literalDefinitions!.some((item) => !item.name.trim())
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await modelCommandApi.updateEnumeration(project.project.id, enumeration.id, {
        expectedRevision: revision,
        draft,
      });
      if (!(await onRefreshProject()))
        throw new Error('The authoritative enumeration projection could not be reloaded.');
      setMessage(`Enumeration saved at model revision ${result.revision}.`);
    } catch (error) {
      setMessage(commandMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="properties-content" aria-busy={busy}>
      <h3>Enumeration Properties</h3>
      <span className="readonly-badge">ENUMERATION</span>
      <label className="property-field">
        <span>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label className="property-field">
        <span>Package</span>
        <select
          value={draft.packageId ?? ''}
          onChange={(event) => setDraft({ ...draft, packageId: event.target.value || null })}
        >
          <option value="">Project root</option>
          {(project.umlModel.packages ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.qualifiedName}
            </option>
          ))}
        </select>
      </label>
      <section className="property-section">
        <h4>Ordered Literals</h4>
        {draft.literalDefinitions!.map((literal, index) => (
          <div className="structured-list-row" key={literal.id}>
            <input
              aria-label={`Literal ${index + 1}`}
              value={literal.name}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  literalDefinitions: draft.literalDefinitions!.map((item) =>
                    item.id === literal.id ? { ...item, name: event.target.value } : item,
                  ),
                })
              }
            />
            <button
              type="button"
              aria-label={`Move ${literal.name} earlier`}
              disabled={index === 0}
              onClick={() =>
                setDraft({
                  ...draft,
                  literalDefinitions: move(draft.literalDefinitions!, index, index - 1),
                })
              }
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move ${literal.name} later`}
              disabled={index === draft.literalDefinitions!.length - 1}
              onClick={() =>
                setDraft({
                  ...draft,
                  literalDefinitions: move(draft.literalDefinitions!, index, index + 1),
                })
              }
            >
              Down
            </button>
            {persistedLiteralIds.has(literal.id) ? (
              <button
                type="button"
                className="danger-button"
                aria-label={`Delete literal ${literal.name}`}
                onClick={() => appStoreActions.openModal({
                  type: 'deleteModelTypeElement',
                  targetKind: 'ENUMERATION_LITERAL',
                  elementId: literal.id,
                  elementName: initial.literalDefinitions!.find((item) => item.id === literal.id)?.name ?? literal.name,
                  ownerId: enumeration.id,
                  ownerName: enumeration.qualifiedName ?? enumeration.name,
                  position: index + 1,
                  total: draft.literalDefinitions!.length,
                })}
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Remove new literal ${literal.name || index + 1}`}
                onClick={() => setDraft({
                  ...draft,
                  literalDefinitions: draft.literalDefinitions!.filter((item) => item.id !== literal.id),
                })}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setDraft({
              ...draft,
              literalDefinitions: [
                ...draft.literalDefinitions!,
                { id: `literal-${crypto.randomUUID()}`, name: '' },
              ],
            })
          }
        >
          Add Literal
        </button>
      </section>
      {duplicate ? (
        <p className="properties-message properties-message-error">Literal names must be unique.</p>
      ) : null}
      {message ? (
        <p
          className={
            message.includes('saved')
              ? 'properties-message properties-message-success'
              : 'properties-message properties-message-error'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
      <div className="properties-actions">
        <button
          className="danger-button"
          type="button"
          disabled={busy || !revision}
          onClick={() => appStoreActions.openModal({
            type: 'deleteModelTypeElement',
            targetKind: 'ENUMERATION',
            elementId: enumeration.id,
            elementName: enumeration.qualifiedName ?? enumeration.name,
          })}
        >
          Delete Enumeration
        </button>
        <button type="button" disabled={busy} onClick={() => setDraft(initial)}>
          Discard
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={
            busy ||
            !revision ||
            duplicate ||
            !draft.name.trim() ||
            draft.literalDefinitions!.some((item) => !item.name.trim())
          }
          onClick={() => void save()}
        >
          {busy ? 'Saving...' : 'Save Enumeration'}
        </button>
      </div>
    </div>
  );
}

export function DataTypePropertiesPanel({
  project,
  dataType,
  revision,
  onRefreshProject,
}: Common & { dataType: UmlDataTypeDto }) {
  const [draft, setDraft] = useState(dataType);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setDraft(dataType), [dataType]);
  const persistedPropertyIds = useMemo(
    () => new Set(dataType.properties.map((item) => item.id)),
    [dataType],
  );
  const invalid =
    !draft.name.trim() ||
    draft.properties.some((item) => !item.name.trim() || !item.type.trim()) ||
    new Set(draft.properties.map((item) => item.name.trim().toLocaleLowerCase())).size !==
      draft.properties.length;
  const save = async () => {
    if (invalid || !revision || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await modelCommandApi.updateDataType(project.project.id, dataType.id, {
        expectedRevision: revision,
        draft,
      });
      if (!(await onRefreshProject()))
        throw new Error('The authoritative DataType projection could not be reloaded.');
      setMessage(`DataType saved at model revision ${result.revision}.`);
    } catch (error) {
      setMessage(commandMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="properties-content" aria-busy={busy}>
      <h3>DataType Properties</h3>
      <span className="readonly-badge">VALUE TYPE</span>
      <label className="property-field">
        <span>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label className="property-field">
        <span>Package</span>
        <select
          value={draft.packageId ?? ''}
          onChange={(event) => setDraft({ ...draft, packageId: event.target.value || null })}
        >
          <option value="">Project root</option>
          {(project.umlModel.packages ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.qualifiedName}
            </option>
          ))}
        </select>
      </label>
      <section className="property-section">
        <h4>Value Properties</h4>
        {draft.properties.map((property, index) => (
          <div className="datatype-property-editor" key={property.id}>
            <label className="property-field">
              <span>Property {index + 1}</span>
              <input
                value={property.name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    properties: draft.properties.map((item) =>
                      item.id === property.id ? { ...item, name: event.target.value } : item,
                    ),
                  })
                }
              />
            </label>
            <TypePicker
              project={project}
              label="Property type"
              value={property.type}
              allowStructured
              onChange={(type) =>
                setDraft({
                  ...draft,
                  properties: draft.properties.map((item) =>
                    item.id === property.id ? { ...item, type } : item,
                  ),
                })
              }
            />
            {persistedPropertyIds.has(property.id) ? (
              <button
                type="button"
                className="danger-button"
                aria-label={`Delete value property ${property.name}`}
                onClick={() => appStoreActions.openModal({
                  type: 'deleteModelTypeElement',
                  targetKind: 'DATATYPE_PROPERTY',
                  elementId: property.id,
                  elementName: dataType.properties.find((item) => item.id === property.id)?.name ?? property.name,
                  ownerId: dataType.id,
                  ownerName: dataType.qualifiedName ?? dataType.name,
                  position: index + 1,
                  total: draft.properties.length,
                })}
              >
                Delete property
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Remove new value property ${property.name || index + 1}`}
                onClick={() => setDraft({
                  ...draft,
                  properties: draft.properties.filter((item) => item.id !== property.id),
                })}
              >
                Remove property
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setDraft({
              ...draft,
              properties: [
                ...draft.properties,
                { id: `property-${crypto.randomUUID()}`, name: '', type: 'String' },
              ],
            })
          }
        >
          Add Value Property
        </button>
      </section>
      {invalid ? (
        <p className="properties-message properties-message-error">
          Name, unique property names and property types are required.
        </p>
      ) : null}
      {message ? (
        <p
          className={
            message.includes('saved')
              ? 'properties-message properties-message-success'
              : 'properties-message properties-message-error'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
      <div className="properties-actions">
        <button
          className="danger-button"
          type="button"
          disabled={busy || !revision}
          onClick={() => appStoreActions.openModal({
            type: 'deleteModelTypeElement',
            targetKind: 'DATATYPE',
            elementId: dataType.id,
            elementName: dataType.qualifiedName ?? dataType.name,
          })}
        >
          Delete DataType
        </button>
        <button type="button" disabled={busy} onClick={() => setDraft(dataType)}>
          Discard
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={invalid || busy || !revision}
          onClick={() => void save()}
        >
          {busy ? 'Saving...' : 'Save DataType'}
        </button>
      </div>
    </div>
  );
}

function normalizeEnumeration(item: UmlEnumerationDto): UmlEnumerationDto {
  return {
    ...item,
    literalDefinitions: item.literalDefinitions?.length
      ? item.literalDefinitions
      : item.literals.map((name) => ({ id: `literal-${crypto.randomUUID()}`, name })),
  };
}
function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
function commandMessage(error: unknown) {
  return error instanceof ApiClientError
    ? `${error.dto.code}: ${error.dto.userMessage ?? error.dto.message}`
    : error instanceof Error
      ? error.message
      : 'The command failed.';
}
