import type { ProjectDto } from '../../../api';
import {
  formatStructuredTypeSyntax,
  parseStructuredTypeSyntax,
  type StructuredTypeSyntax,
} from './structuredTypeSyntax';

export function TypePicker({
  project,
  value,
  label = 'Type',
  onChange,
  allowVoid = false,
  allowStructured = false,
}: {
  project: ProjectDto;
  value: string;
  label?: string;
  onChange: (value: string) => void;
  allowVoid?: boolean;
  allowStructured?: boolean;
}) {
  return (
    <TypeSyntaxPicker
      project={project}
      syntax={parseStructuredTypeSyntax(value)}
      label={label}
      allowVoid={allowVoid}
      allowStructured={allowStructured}
      onChange={(next) => onChange(formatStructuredTypeSyntax(next))}
    />
  );
}

function TypeSyntaxPicker({
  project,
  syntax,
  label,
  onChange,
  allowVoid = false,
  allowStructured = false,
}: {
  project: ProjectDto;
  syntax: StructuredTypeSyntax;
  label: string;
  onChange: (value: StructuredTypeSyntax) => void;
  allowVoid?: boolean;
  allowStructured?: boolean;
}) {
  const primitives = project.umlModel.primitiveTypes?.length
    ? project.umlModel.primitiveTypes
    : ['Boolean', 'Integer', 'Real', 'String'];
  const selected =
    syntax.kind === 'named'
      ? syntax.name
      : syntax.kind === 'tuple'
        ? '__tuple__'
        : `__${syntax.collectionKind}__`;
  const knownNames = new Set([
    ...primitives,
    ...(allowVoid ? ['Void'] : []),
    ...(project.umlModel.enumerations ?? []).map((item) => item.qualifiedName ?? item.name),
    ...(project.umlModel.dataTypes ?? []).map((item) => item.qualifiedName ?? item.name),
    ...project.umlModel.classes.map((item) => item.qualifiedName ?? item.name),
  ]);
  const selectType = (choice: string) => {
    if (choice === '__tuple__')
      onChange({
        kind: 'tuple',
        fields: [{ name: 'field', type: { kind: 'named', name: 'String' } }],
      });
    else if (choice.startsWith('__'))
      onChange({
        kind: 'collection',
        collectionKind: choice.slice(2, -2) as 'Set' | 'Bag' | 'Sequence' | 'OrderedSet',
        elementType: { kind: 'named', name: 'String' },
      });
    else onChange({ kind: 'named', name: choice });
  };
  return (
    <div className="structured-type-picker">
      <label className="property-field">
        <span>{label}</span>
        <select
          aria-label={label}
          value={selected}
          onChange={(event) => selectType(event.target.value)}
        >
          <optgroup label="Primitive types">
            {primitives.map((type) => (
              <option key={type}>{type}</option>
            ))}
            {allowVoid ? <option>Void</option> : null}
          </optgroup>
          {(project.umlModel.enumerations ?? []).length ? (
            <optgroup label="Enumerations">
              {project.umlModel.enumerations!.map((item) => (
                <option key={item.id} value={item.qualifiedName ?? item.name}>
                  {item.qualifiedName ?? item.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {(project.umlModel.dataTypes ?? []).length ? (
            <optgroup label="DataTypes">
              {project.umlModel.dataTypes!.map((item) => (
                <option key={item.id} value={item.qualifiedName ?? item.name}>
                  {item.qualifiedName ?? item.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {project.umlModel.classes.length ? (
            <optgroup label="Classes">
              {project.umlModel.classes.map((item) => (
                <option key={item.id} value={item.qualifiedName ?? item.name}>
                  {item.qualifiedName ?? item.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {allowStructured || syntax.kind !== 'named' ? (
            <optgroup label="Structured types">
              <option value="__tuple__">Tuple</option>
              <option value="__Set__">Set</option>
              <option value="__Bag__">Bag</option>
              <option value="__Sequence__">Sequence</option>
              <option value="__OrderedSet__">OrderedSet</option>
            </optgroup>
          ) : null}
          {syntax.kind === 'named' && !knownNames.has(syntax.name) ? (
            <option value={syntax.name}>{syntax.name}</option>
          ) : null}
        </select>
      </label>
      {syntax.kind === 'collection' ? (
        <div className="structured-type-nested">
          <TypeSyntaxPicker
            project={project}
            syntax={syntax.elementType}
            label={`${label} element type`}
            allowStructured
            onChange={(elementType) => onChange({ ...syntax, elementType })}
          />
        </div>
      ) : null}
      {syntax.kind === 'tuple' ? (
        <fieldset className="tuple-type-fields">
          <legend>{label} fields</legend>
          {syntax.fields.map((field, index) => (
            <div className="tuple-type-field" key={index}>
              <label className="property-field">
                <span>Field {index + 1} name</span>
                <input
                  aria-label={`${label} field ${index + 1} name`}
                  value={field.name}
                  onChange={(event) =>
                    onChange({
                      ...syntax,
                      fields: syntax.fields.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    })
                  }
                />
              </label>
              <TypeSyntaxPicker
                project={project}
                syntax={field.type}
                label={`${label} field ${index + 1} type`}
                allowStructured
                onChange={(type) =>
                  onChange({
                    ...syntax,
                    fields: syntax.fields.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, type } : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                disabled={syntax.fields.length === 1}
                onClick={() =>
                  onChange({
                    ...syntax,
                    fields: syntax.fields.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove field
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...syntax,
                fields: [
                  ...syntax.fields,
                  {
                    name: `field${syntax.fields.length + 1}`,
                    type: { kind: 'named', name: 'String' },
                  },
                ],
              })
            }
          >
            Add tuple field
          </button>
        </fieldset>
      ) : null}
    </div>
  );
}
