import type {
  ElementTargetDto,
  Id,
  ProjectDto,
  ValidationErrorDto,
  ValidationResultDto,
} from '../../../api';
import type { SelectionState } from '../../../state';

export type ValidationMessage = ValidationErrorDto & {
  messageGroup: 'errors' | 'warnings' | 'infos';
};

export function collectValidationMessages(result: ValidationResultDto | null): ValidationMessage[] {
  if (!result) {
    return [];
  }

  return [
    ...result.errors.map((message) => ({ ...message, messageGroup: 'errors' as const })),
    ...(result.warnings ?? []).map((message) => ({ ...message, messageGroup: 'warnings' as const })),
    ...(result.infos ?? []).map((message) => ({ ...message, messageGroup: 'infos' as const })),
  ];
}

export function resolveValidationErrorSelection(error: ValidationErrorDto): SelectionState {
  const primaryTarget = pickPrimaryTarget(error);

  if (!primaryTarget) {
    return null;
  }

  switch (primaryTarget.elementType) {
    case 'OBJECT':
      return { view: 'object-diagram', type: 'object', id: primaryTarget.elementId };
    case 'OBJECT_LINK':
      return { view: 'object-diagram', type: 'objectLink', id: primaryTarget.elementId };
    case 'CLASS':
      return { view: 'class-diagram', type: 'class', id: primaryTarget.elementId };
    case 'ASSOCIATION':
    case 'ASSOCIATION_END':
      return { view: 'class-diagram', type: 'association', id: primaryTarget.elementId };
    case 'INVARIANT':
    case 'OCL_EXPRESSION':
      return { view: 'ocl', type: 'invariant', id: error.invariantId ?? primaryTarget.elementId };
    default:
      return null;
  }
}

export function formatTargetLabel(
  target: ElementTargetDto,
  project?: ProjectDto | null,
) {
  return `${formatElementTypeLabel(target.elementType)} ${formatElementLabel(target.elementType, target.elementId, project)}`;
}

export function formatSelectionFocusLabel(
  selection: SelectionState,
  project?: ProjectDto | null,
) {
  if (!selection) {
    return 'no mapped UI element';
  }

  const elementType = selectionElementType(selection);
  return elementType
    ? `${formatElementTypeLabel(elementType)} ${formatElementLabel(elementType, selection.id, project)}`
    : 'mapped UI element';
}

export function formatValidationContextLabels(
  error: ValidationErrorDto,
  project?: ProjectDto | null,
) {
  const labels: string[] = [];

  if (error.contextObjectId) {
    labels.push(
      `Object: ${formatElementLabel('OBJECT', error.contextObjectId, project)}`,
    );
  }

  if (error.contextClassId) {
    labels.push(
      `Class: ${formatElementLabel('CLASS', error.contextClassId, project)}`,
    );
  }

  if (error.invariantId) {
    labels.push(
      `Invariant: ${formatElementLabel('INVARIANT', error.invariantId, project)}`,
    );
  }

  if (error.associationId) {
    labels.push(
      `Association: ${formatElementLabel('ASSOCIATION', error.associationId, project)}`,
    );
  }

  if (error.linkId) {
    labels.push(
      `Object link: ${formatElementLabel('OBJECT_LINK', error.linkId, project)}`,
    );
  }

  if (error.elementType && error.elementId) {
    labels.push(
      `${formatElementTypeLabel(error.elementType)}: ${formatElementLabel(error.elementType, error.elementId, project)}`,
    );
  }

  return labels.filter((label, index, allLabels) => allLabels.indexOf(label) === index);
}

export function formatValidationMessageSummary(
  error: ValidationErrorDto,
  project?: ProjectDto | null,
) {
  const objectLabel = error.contextObjectId
    ? formatElementLabel('OBJECT', error.contextObjectId, project)
    : null;
  const invariantLabel = error.invariantId
    ? formatElementLabel('INVARIANT', error.invariantId, project)
    : null;
  const elementLabel =
    error.elementType && error.elementId
      ? formatElementLabel(error.elementType, error.elementId, project)
      : null;
  const associationLabel = error.associationId
    ? formatElementLabel('ASSOCIATION', error.associationId, project)
    : null;
  const linkLabel = error.linkId
    ? formatElementLabel('OBJECT_LINK', error.linkId, project)
    : null;
  const attributeLabel = findDetailString(error.details, 'attributeName')
    ?? findAttributeNameFromMessage(error.message)
    ?? findPropertyNameFromMessage(error.message);
  const roleLabel = findDetailString(error.details, 'roleName');

  if (error.code === 'INVARIANT_VIOLATION' && invariantLabel && objectLabel) {
    return `Invariant ${invariantLabel} failed for object ${objectLabel}.`;
  }

  if (error.code === 'MULTIPLICITY_VIOLATION') {
    const target = roleLabel ? `role ${roleLabel}` : associationLabel ?? elementLabel;
    return target
      ? `Multiplicity violation in ${target}.`
      : 'Multiplicity violation in an association.';
  }

  if (error.code === 'INVALID_SLOT_VALUE') {
    const target = attributeLabel && objectLabel
      ? `${objectLabel}.${attributeLabel}`
      : elementLabel ?? objectLabel;
    return target
      ? `Invalid value for ${target}.`
      : 'Invalid object attribute value.';
  }

  if (error.code === 'INVALID_LINK') {
    return linkLabel
      ? `Invalid object link ${linkLabel}.`
      : associationLabel
        ? `Invalid object link for association ${associationLabel}.`
        : 'Invalid object link.';
  }

  if (error.code === 'UNKNOWN_ATTRIBUTE') {
    const property = findPropertyNameFromMessage(error.message);
    return property && invariantLabel
      ? `Unknown property ${property} in invariant ${invariantLabel}.`
      : invariantLabel
        ? `Unknown property in invariant ${invariantLabel}.`
        : 'Unknown attribute or navigation property.';
  }

  if (error.code === 'EVALUATION_ERROR') {
    const property = attributeLabel ?? findPropertyNameFromMessage(error.message);
    if (property && objectLabel && invariantLabel) {
      return `Cannot evaluate ${property} on ${objectLabel} for invariant ${invariantLabel}.`;
    }
    if (objectLabel && invariantLabel) {
      return `Cannot evaluate invariant ${invariantLabel} for object ${objectLabel}.`;
    }
    return 'OCL expression could not be evaluated for the current snapshot.';
  }

  if ((error.code === 'SYNTAX_ERROR' || error.code === 'TYPE_ERROR') && invariantLabel) {
    return `${error.code === 'SYNTAX_ERROR' ? 'Syntax error' : 'Type error'} in ${invariantLabel}.`;
  }

  return error.userMessage ?? error.message;
}

export function formatDetails(details: Record<string, unknown> | undefined) {
  if (!details || Object.keys(details).length === 0) {
    return null;
  }

  const labels: string[] = [];
  addDetail(labels, 'Invariant', details.invariantName);
  addDetail(labels, 'Object', details.contextObjectName);
  addDetail(labels, 'Attribute', details.attributeName ?? details.propertyName);
  addDetail(labels, 'Association', details.associationName);
  addDetail(labels, 'Role', details.roleName);
  addDetail(labels, 'Expected', details.expectedType ?? details.expectedClassId ?? details.expected);
  addDetail(labels, 'Actual', details.actualValue ?? details.actualType ?? details.actualCount);
  addDetail(labels, 'Allowed', details.expectedCount ?? details.upperBound ?? details.multiplicity);
  addDetail(labels, 'Phase', details.phase);

  return labels.length > 0 ? labels.join(', ') : null;
}

function pickPrimaryTarget(error: ValidationErrorDto): ElementTargetDto | null {
  if (error.contextObjectId) {
    return { elementType: 'OBJECT', elementId: error.contextObjectId };
  }

  if (error.elementType && error.elementId) {
    return { elementType: error.elementType, elementId: error.elementId };
  }

  const objectTarget = findTarget(error.targets, ['OBJECT']);
  if (objectTarget) {
    return objectTarget;
  }

  if (error.linkId) {
    return { elementType: 'OBJECT_LINK', elementId: error.linkId };
  }

  if (error.invariantId) {
    return { elementType: 'INVARIANT', elementId: error.invariantId };
  }

  if (error.associationId) {
    return { elementType: 'ASSOCIATION', elementId: error.associationId };
  }

  return error.targets[0] ?? null;
}

function findTarget(targets: ElementTargetDto[], types: ElementTargetDto['elementType'][]) {
  return targets.find((target) => types.includes(target.elementType));
}

function selectionElementType(selection: NonNullable<SelectionState>): ElementTargetDto['elementType'] | null {
  switch (selection.type) {
    case 'object':
      return 'OBJECT';
    case 'objectLink':
      return 'OBJECT_LINK';
    case 'class':
      return 'CLASS';
    case 'association':
      return 'ASSOCIATION';
    case 'invariant':
      return 'INVARIANT';
    default:
      return null;
  }
}

function formatDetailValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatDetailValue).join(', ');
  }

  return JSON.stringify(value);
}

function addDetail(labels: string[], label: string, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  labels.push(`${label}: ${formatDetailValue(value)}`);
}

function findDetailString(details: Record<string, unknown> | undefined, key: string) {
  const value = details?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function findPropertyNameFromMessage(message: string) {
  return quotedValueAfter(message, 'Property')
    ?? quotedValueAfter(message, 'property')
    ?? quotedValueAfter(message, 'Slot value for property');
}

function findAttributeNameFromMessage(message: string) {
  return quotedValueAfter(message, 'attribute')
    ?? quotedValueAfter(message, 'Attribute');
}

function quotedValueAfter(message: string, word: string) {
  const match = new RegExp(`${word} '\\s*([^']+)\\s*'`).exec(message);
  return match?.[1] ?? null;
}

export function countAffectedTargets(messages: ValidationMessage[]): number {
  const ids = new Set<Id>();

  messages.forEach((message) => {
    message.targets.forEach((target) => ids.add(target.elementId));
    if (message.contextObjectId) {
      ids.add(message.contextObjectId);
    }
    if (message.invariantId) {
      ids.add(message.invariantId);
    }
    if (message.associationId) {
      ids.add(message.associationId);
    }
    if (message.linkId) {
      ids.add(message.linkId);
    }
  });

  return ids.size;
}

function formatElementLabel(
  elementType: ElementTargetDto['elementType'],
  elementId: Id,
  project?: ProjectDto | null,
) {
  if (!project) {
    return elementId;
  }

  switch (elementType) {
    case 'CLASS':
      return formatClassLabel(project, elementId);
    case 'ATTRIBUTE':
      return formatAttributeLabel(project, elementId);
    case 'OPERATION':
      return formatOperationLabel(project, elementId);
    case 'ASSOCIATION':
    case 'ASSOCIATION_END':
      return formatAssociationLabel(project, elementId);
    case 'INVARIANT':
    case 'OCL_EXPRESSION':
      return formatInvariantLabel(project, elementId);
    case 'OBJECT':
      return formatObjectLabel(project, elementId);
    case 'SLOT':
      return formatSlotLabel(project, elementId);
    case 'OBJECT_LINK':
      return formatObjectLinkLabel(project, elementId);
    default:
      return elementId;
  }
}

function formatClassLabel(project: ProjectDto, classId: Id) {
  const umlClass = project.umlModel.classes.find((candidate) => candidate.id === classId);
  return umlClass ? umlClass.name : classId;
}

function formatAttributeLabel(project: ProjectDto, attributeId: Id) {
  for (const umlClass of project.umlModel.classes) {
    const attribute = umlClass.attributes.find((candidate) => candidate.id === attributeId);
    if (attribute) {
      return `${umlClass.name}.${attribute.name} : ${attribute.type}`;
    }
  }

  return attributeId;
}

function formatOperationLabel(project: ProjectDto, operationId: Id) {
  for (const umlClass of project.umlModel.classes) {
    const operation = umlClass.operations.find((candidate) => candidate.id === operationId);
    if (operation) {
      return `${umlClass.name}.${operation.name}() : ${operation.returnType}`;
    }
  }

  return operationId;
}

function formatAssociationLabel(project: ProjectDto, associationOrEndId: Id) {
  for (const association of project.umlModel.associations) {
    if (association.id === associationOrEndId) {
      return association.name;
    }

    const associationEnd = association.ends.find((end) => end.id === associationOrEndId);
    if (associationEnd) {
      const className =
        project.umlModel.classes.find((umlClass) => umlClass.id === associationEnd.classId)
          ?.name ?? associationEnd.classId;
      return `${association.name}.${associationEnd.roleName} -> ${className} [${associationEnd.multiplicity.raw}]`;
    }
  }

  return associationOrEndId;
}

function formatInvariantLabel(project: ProjectDto, invariantId: Id) {
  const invariant = project.umlModel.invariants.find(
    (candidate) => candidate.id === invariantId,
  );
  if (!invariant) {
    return invariantId;
  }

  const contextClass =
    project.umlModel.classes.find((umlClass) => umlClass.id === invariant.contextClassId)
      ?.name ?? invariant.contextClassId;

  return `${invariant.name} on ${contextClass}`;
}

function formatObjectLabel(project: ProjectDto, objectId: Id) {
  const object = project.objectModel.objects.find((candidate) => candidate.id === objectId);
  if (!object) {
    return objectId;
  }

  const className =
    project.umlModel.classes.find((umlClass) => umlClass.id === object.classId)?.name ??
    object.classId;

  return `${object.name} : ${className}`;
}

function formatSlotLabel(project: ProjectDto, slotId: Id) {
  for (const object of project.objectModel.objects) {
    const slot = object.slots.find((candidate) => candidate.id === slotId);
    if (slot) {
      const attribute = project.umlModel.classes
        .flatMap((umlClass) => umlClass.attributes)
        .find((candidate) => candidate.id === slot.attributeId);
      const attributeName = attribute?.name ?? slot.attributeId;
      return `${object.name}.${attributeName}`;
    }
  }

  return slotId;
}

function formatObjectLinkLabel(project: ProjectDto, linkId: Id) {
  const link = project.objectModel.links.find((candidate) => candidate.id === linkId);
  if (!link) {
    return linkId;
  }

  const association = project.umlModel.associations.find(
    (candidate) => candidate.id === link.associationId,
  );
  const objectNames = link.endValues.map((endValue) => {
    const object = project.objectModel.objects.find(
      (candidate) => candidate.id === endValue.objectId,
    );
    return object?.name ?? endValue.objectId;
  });

  return `${association?.name ?? link.associationId}: ${objectNames.join(' - ')}`;
}

function formatElementTypeLabel(elementType: ElementTargetDto['elementType']) {
  switch (elementType) {
    case 'OBJECT_LINK':
      return 'Object link';
    case 'ASSOCIATION_END':
      return 'Association end';
    case 'OCL_EXPRESSION':
      return 'OCL expression';
    default:
      return elementType.charAt(0) + elementType.slice(1).toLowerCase();
  }
}
