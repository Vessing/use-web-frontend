import type {
  MultiplicityDto,
  ProjectDto,
  UmlAssociationDto,
  UmlAttributeDto,
  UmlClassDto,
  UmlInvariantDto,
  UmlOperationDto,
  UmlParameterDto,
} from '../../api/dtos';

const FALLBACK_MODEL_NAME = 'Model';

export function getEditableModelText(project: ProjectDto): string {
  const importedText = project.modelText?.modelText;

  if (importedText && importedText.trim().length > 0 && !isModelTextStale(project)) {
    return importedText;
  }

  return renderUseModelText(project);
}

export function renderUseModelText(project: ProjectDto): string {
  const lines: string[] = [`model ${sanitizeModelName(project.project.name)}`, ''];

  project.umlModel.classes.forEach((umlClass, index) => {
    lines.push(...renderClass(umlClass));

    if (index < project.umlModel.classes.length - 1) {
      lines.push('');
    }
  });

  if (project.umlModel.associations.length > 0) {
    lines.push('');
    project.umlModel.associations.forEach((association, index) => {
      lines.push(...renderAssociation(project, association));

      if (index < project.umlModel.associations.length - 1) {
        lines.push('');
      }
    });
  }

  if (project.umlModel.invariants.length > 0) {
    lines.push('', 'constraints');
    project.umlModel.invariants.forEach((invariant) => {
      lines.push(...renderInvariant(project, invariant));
    });
  }

  return `${lines.join('\n')}\n`;
}

function renderClass(umlClass: UmlClassDto): string[] {
  const lines = [`class ${umlClass.name}`];

  if (umlClass.attributes.length > 0) {
    lines.push('attributes');
    umlClass.attributes.forEach((attribute) => {
      lines.push(`  ${renderAttribute(attribute)}`);
    });
  }

  if (umlClass.operations.length > 0) {
    lines.push('operations');
    umlClass.operations.forEach((operation) => {
      lines.push(`  ${renderOperation(operation)}`);
    });
  }

  lines.push('end');
  return lines;
}

function renderAttribute(attribute: UmlAttributeDto): string {
  return `${attribute.name} : ${attribute.type}`;
}

function renderOperation(operation: UmlOperationDto): string {
  const parameters = operation.parameters.map(renderParameter).join(', ');
  return `${operation.name}(${parameters}) : ${operation.returnType}`;
}

function renderParameter(parameter: UmlParameterDto): string {
  return `${parameter.name} : ${parameter.type}`;
}

function renderAssociation(project: ProjectDto, association: UmlAssociationDto): string[] {
  const lines = [`association ${association.name} between`];

  association.ends.forEach((end) => {
    const className = project.umlModel.classes.find((umlClass) => umlClass.id === end.classId)?.name;
    lines.push(
      `  ${className ?? end.classId}[${renderMultiplicity(end.multiplicity)}] role ${end.roleName}`,
    );
  });

  lines.push('end');
  return lines;
}

function renderMultiplicity(multiplicity: MultiplicityDto): string {
  if (multiplicity.raw.trim().length > 0) {
    return multiplicity.raw;
  }

  const upper = multiplicity.unbounded ? '*' : multiplicity.upper;
  return multiplicity.lower === upper ? String(multiplicity.lower) : `${multiplicity.lower}..${upper}`;
}

function renderInvariant(project: ProjectDto, invariant: UmlInvariantDto): string[] {
  const className =
    project.umlModel.classes.find((umlClass) => umlClass.id === invariant.contextClassId)?.name ??
    invariant.contextClassId;

  return [`context ${className} inv ${invariant.name}:`, `  ${invariant.expression}`];
}

function sanitizeModelName(rawName: string): string {
  const sanitized = rawName.replace(/[^A-Za-z0-9_]/g, '').trim();
  return sanitized.length > 0 ? sanitized : FALLBACK_MODEL_NAME;
}

function isModelTextStale(project: ProjectDto) {
  const projectUpdatedAt = parseTimestamp(project.project.updatedAt);
  const modelTextUpdatedAt = parseTimestamp(project.modelText?.updatedAt);

  if (projectUpdatedAt === null || modelTextUpdatedAt === null) {
    return false;
  }

  return projectUpdatedAt > modelTextUpdatedAt;
}

function parseTimestamp(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}
