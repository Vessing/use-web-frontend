import type { ProjectDto } from '../../../api';
import {
  formatStructuredTypeSyntax,
  parseStructuredTypeSyntax,
  type StructuredTypeSyntax,
} from '../../class-diagram/properties/structuredTypeSyntax';

interface Props {
  project: ProjectDto;
  type: string;
  value: unknown;
  label: string;
  nullable?: boolean;
  errorPath?: string | null;
  valuePath?: string;
  onChange: (value: unknown) => void;
}

export function TypeDirectedValueEditor({
  project,
  type,
  value,
  label,
  nullable = true,
  errorPath = null,
  valuePath = 'value',
  onChange,
}: Props) {
  const enumeration = (project.umlModel.enumerations ?? []).find(
    (item) => item.name === type || item.qualifiedName === type,
  );
  const dataType = (project.umlModel.dataTypes ?? []).find(
    (item) => item.name === type || item.qualifiedName === type,
  );
  const syntax = parseStructuredTypeSyntax(type);
  const rejected = matchesPath(errorPath, valuePath);

  if (value === null || value === undefined)
    return (
      <fieldset className="typed-value-editor" aria-invalid={rejected || undefined}>
        <legend>
          {label} : {type}
        </legend>
        <span className="value-status value-status-null">null</span>
        {nullable ? (
          <button type="button" onClick={() => onChange(defaultValue(project, syntax))}>
            Set value
          </button>
        ) : null}
      </fieldset>
    );

  if (syntax.kind === 'collection') {
    const items = Array.isArray(value) ? value : [];
    const elementType = formatStructuredTypeSyntax(syntax.elementType);
    return (
      <fieldset
        className="typed-value-editor collection-value-editor"
        aria-invalid={rejected || undefined}
      >
        <legend>
          {label} : {type}
        </legend>
        <small>
          {syntax.collectionKind} rules are validated by the backend. The authoritative projection
          preserves duplicates and order where the declared kind allows them.
        </small>
        {items.map((item, index) => (
          <div className="structured-list-row" key={index}>
            <TypeDirectedValueEditor
              project={project}
              type={elementType}
              label={`Item ${index + 1}`}
              value={item}
              nullable={false}
              errorPath={errorPath}
              valuePath={`${valuePath}[${index}]`}
              onChange={(next) =>
                onChange(items.map((current, itemIndex) => (itemIndex === index ? next : current)))
              }
            />
            {syntax.collectionKind === 'Sequence' || syntax.collectionKind === 'OrderedSet' ? (
              <>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onChange(move(items, index, index - 1))}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => onChange(move(items, index, index + 1))}
                >
                  Down
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, defaultValue(project, syntax.elementType)])}
        >
          Add item
        </button>
        {nullable ? (
          <button type="button" onClick={() => onChange(null)}>
            Set null
          </button>
        ) : null}
      </fieldset>
    );
  }

  if (dataType) {
    const fields = recordValue(value);
    return (
      <fieldset
        className="typed-value-editor datatype-value-editor"
        aria-invalid={rejected || undefined}
      >
        <legend>
          {label} : {dataType.qualifiedName ?? dataType.name}
        </legend>
        {dataType.properties.map((property) => (
          <TypeDirectedValueEditor
            key={property.id}
            project={project}
            type={property.type}
            label={property.name}
            value={fields[property.name] ?? null}
            errorPath={errorPath}
            valuePath={`${valuePath}.${property.name}`}
            onChange={(next) => onChange({ ...fields, [property.name]: next })}
          />
        ))}
        {nullable ? (
          <button type="button" onClick={() => onChange(null)}>
            Set null
          </button>
        ) : null}
      </fieldset>
    );
  }

  if (syntax.kind === 'tuple') {
    const fields = recordValue(value);
    return (
      <fieldset
        className="typed-value-editor datatype-value-editor"
        aria-invalid={rejected || undefined}
      >
        <legend>
          {label} : {type}
        </legend>
        {syntax.fields.map((field) => (
          <TypeDirectedValueEditor
            key={field.name}
            project={project}
            type={formatStructuredTypeSyntax(field.type)}
            label={field.name}
            value={fields[field.name] ?? null}
            errorPath={errorPath}
            valuePath={`${valuePath}.${field.name}`}
            onChange={(next) => onChange({ ...fields, [field.name]: next })}
          />
        ))}
        {nullable ? (
          <button type="button" onClick={() => onChange(null)}>
            Set null
          </button>
        ) : null}
      </fieldset>
    );
  }

  if (enumeration)
    return (
      <label className="property-field typed-value-editor">
        <span>
          {label} : {enumeration.qualifiedName ?? enumeration.name}
        </span>
        <select
          aria-invalid={rejected || undefined}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {enumeration.literals.map((literal) => (
            <option key={literal}>{literal}</option>
          ))}
        </select>
        {nullable ? (
          <button type="button" onClick={() => onChange(null)}>
            Set null
          </button>
        ) : null}
      </label>
    );
  if (type === 'Boolean')
    return (
      <label className="property-field typed-value-editor">
        <span>{label} : Boolean</span>
        <select
          aria-invalid={rejected || undefined}
          value={String(value)}
          onChange={(event) => onChange(event.target.value === 'true')}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        {nullable ? (
          <button type="button" onClick={() => onChange(null)}>
            Set null
          </button>
        ) : null}
      </label>
    );
  return (
    <label className="property-field typed-value-editor">
      <span>
        {label} : {type}
      </span>
      <input
        aria-invalid={rejected || undefined}
        type={type === 'Integer' || type === 'Real' ? 'number' : 'text'}
        step={type === 'Integer' ? '1' : type === 'Real' ? 'any' : undefined}
        value={String(value)}
        onChange={(event) =>
          onChange(
            type === 'Integer' || type === 'Real'
              ? event.target.value === ''
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
      {nullable ? (
        <button type="button" onClick={() => onChange(null)}>
          Set null
        </button>
      ) : null}
    </label>
  );
}

function defaultValue(project: ProjectDto, syntax: StructuredTypeSyntax): unknown {
  if (syntax.kind === 'collection') return [];
  if (syntax.kind === 'tuple')
    return Object.fromEntries(
      syntax.fields.map((item) => [item.name, defaultValue(project, item.type)]),
    );
  const type = syntax.name;
  const enumeration = (project.umlModel.enumerations ?? []).find(
    (item) => item.name === type || item.qualifiedName === type,
  );
  if (enumeration) return enumeration.literals[0] ?? null;
  const dataType = (project.umlModel.dataTypes ?? []).find(
    (item) => item.name === type || item.qualifiedName === type,
  );
  if (dataType)
    return Object.fromEntries(
      dataType.properties.map((item) => [
        item.name,
        defaultValue(project, parseStructuredTypeSyntax(item.type)),
      ]),
    );
  if (type === 'Boolean') return false;
  if (type === 'Integer' || type === 'Real') return 0;
  return '';
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
function matchesPath(errorPath: string | null, valuePath: string): boolean {
  return Boolean(
    errorPath &&
      (errorPath === valuePath ||
        errorPath.endsWith(`.${valuePath}`) ||
        errorPath.startsWith(`${valuePath}.`) ||
        errorPath.startsWith(`${valuePath}[`)),
  );
}
