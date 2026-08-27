import type {
  Id,
  MultiplicityDto,
  ProjectDto,
  UmlAssociationDto,
  UmlAttributeDto,
  UmlClassDto,
  UmlInvariantDto,
  UmlOperationDto,
  UmlTypeDto,
} from '../../../api/dtos';

interface AddClassInput {
  name: string;
  attributes?: Array<{ name: string; type: UmlTypeDto }>;
  operations?: Array<{ name: string; returnType: UmlTypeDto }>;
  position?: { x: number; y: number };
}

interface AddAssociationInput {
  name: string;
  sourceClassId: Id;
  sourceRoleName: string;
  sourceMultiplicity: MultiplicityDto;
  targetClassId: Id;
  targetRoleName: string;
  targetMultiplicity: MultiplicityDto;
}

interface AddInvariantInput {
  name: string;
  contextClassId: Id;
  expression: string;
}

interface AddElementResult {
  project: ProjectDto;
  createdId: Id;
}

export function updateClass(
  project: ProjectDto,
  classId: string,
  updater: (umlClass: UmlClassDto) => UmlClassDto,
): ProjectDto {
  return {
    ...project,
    umlModel: {
      ...project.umlModel,
      classes: project.umlModel.classes.map((umlClass) =>
        umlClass.id === classId ? updater(umlClass) : umlClass,
      ),
    },
  };
}

export function updateAttribute(
  project: ProjectDto,
  classId: string,
  attributeId: string,
  patch: Partial<UmlAttributeDto>,
): ProjectDto {
  return updateClass(project, classId, (umlClass) => ({
    ...umlClass,
    attributes: umlClass.attributes.map((attribute) =>
      attribute.id === attributeId ? { ...attribute, ...patch } : attribute,
    ),
  }));
}

export function addAttribute(
  project: ProjectDto,
  classId: string,
  input: { name?: string; type?: UmlTypeDto } = {},
): AddElementResult {
  const attributeId = createModelId('attr');

  return {
    createdId: attributeId,
    project: updateClass(
      {
        ...project,
        project: touchProject(project),
      },
      classId,
      (umlClass) => ({
        ...umlClass,
        attributes: [
          ...umlClass.attributes,
          {
            id: attributeId,
            name: input.name ?? `attribute${umlClass.attributes.length + 1}`,
            type: input.type ?? 'String',
          },
        ],
      }),
    ),
  };
}

export function updateOperation(
  project: ProjectDto,
  classId: string,
  operationId: string,
  patch: Partial<UmlOperationDto>,
): ProjectDto {
  return updateClass(project, classId, (umlClass) => ({
    ...umlClass,
    operations: umlClass.operations.map((operation) =>
      operation.id === operationId ? { ...operation, ...patch } : operation,
    ),
  }));
}

export function addOperation(
  project: ProjectDto,
  classId: string,
  input: { name?: string; returnType?: UmlTypeDto } = {},
): AddElementResult {
  const operationId = createModelId('op');

  return {
    createdId: operationId,
    project: updateClass(
      {
        ...project,
        project: touchProject(project),
      },
      classId,
      (umlClass) => ({
        ...umlClass,
        operations: [
          ...umlClass.operations,
          {
            id: operationId,
            name: input.name ?? `operation${umlClass.operations.length + 1}`,
            returnType: input.returnType ?? 'Boolean',
            parameters: [],
          },
        ],
      }),
    ),
  };
}

export function updateAssociation(
  project: ProjectDto,
  associationId: string,
  updater: (association: UmlAssociationDto) => UmlAssociationDto,
): ProjectDto {
  return {
    ...project,
    umlModel: {
      ...project.umlModel,
      associations: project.umlModel.associations.map((association) =>
        association.id === associationId ? updater(association) : association,
      ),
    },
  };
}

export function updateAssociationEnd(
  project: ProjectDto,
  associationId: string,
  endId: string,
  patch: {
    roleName?: string;
    multiplicity?: MultiplicityDto;
  },
): ProjectDto {
  return updateAssociation(project, associationId, (association) => ({
    ...association,
    ends: association.ends.map((end) =>
      end.id === endId ? { ...end, ...patch } : end,
    ),
  }));
}

export function updateInvariant(
  project: ProjectDto,
  invariantId: string,
  patch: Partial<UmlInvariantDto>,
): ProjectDto {
  return {
    ...project,
    umlModel: {
      ...project.umlModel,
      invariants: project.umlModel.invariants.map((invariant) =>
        invariant.id === invariantId ? { ...invariant, ...patch } : invariant,
      ),
    },
  };
}

export function addClass(project: ProjectDto, input: AddClassInput): AddElementResult {
  const classId = createModelId('class');
  const attributes = (input.attributes ?? []).map((attribute) => ({
    id: createModelId('attr'),
    name: attribute.name.trim(),
    type: attribute.type,
  }));
  const operations = (input.operations ?? []).map((operation) => ({
    id: createModelId('op'),
    name: operation.name.trim(),
    returnType: operation.returnType,
    parameters: [],
  }));

  return {
    createdId: classId,
    project: {
      ...project,
      project: touchProject(project),
      umlModel: {
        ...project.umlModel,
        classes: [
          ...project.umlModel.classes,
          {
            id: classId,
            name: input.name.trim(),
            attributes,
            operations,
          },
        ],
      },
      layout: {
        ...project.layout,
        classDiagram: {
          ...project.layout.classDiagram,
          nodes: [
            ...project.layout.classDiagram.nodes,
            {
              elementId: classId,
              x: input.position?.x ?? 120 + project.umlModel.classes.length * 40,
              y: input.position?.y ?? 100 + project.umlModel.classes.length * 30,
            },
          ],
        },
        updatedAt: nowIsoString(),
      },
    },
  };
}

export function addAssociation(
  project: ProjectDto,
  input: AddAssociationInput,
): AddElementResult {
  const associationId = createModelId('assoc');

  return {
    createdId: associationId,
    project: {
      ...project,
      project: touchProject(project),
      umlModel: {
        ...project.umlModel,
        associations: [
          ...project.umlModel.associations,
          {
            id: associationId,
            name: input.name.trim(),
            kind: 'association',
            ends: [
              {
                id: createModelId('end'),
                classId: input.sourceClassId,
                roleName: input.sourceRoleName.trim(),
                multiplicity: input.sourceMultiplicity,
                navigable: true,
              },
              {
                id: createModelId('end'),
                classId: input.targetClassId,
                roleName: input.targetRoleName.trim(),
                multiplicity: input.targetMultiplicity,
                navigable: true,
              },
            ],
          },
        ],
      },
    },
  };
}

export function addInvariant(
  project: ProjectDto,
  input: AddInvariantInput,
): AddElementResult {
  const invariantId = createModelId('inv');

  return {
    createdId: invariantId,
    project: {
      ...project,
      project: touchProject(project),
      umlModel: {
        ...project.umlModel,
        invariants: [
          ...project.umlModel.invariants,
          {
            id: invariantId,
            name: input.name.trim(),
            contextClassId: input.contextClassId,
            expression: input.expression.trim(),
            enabled: true,
          },
        ],
      },
    },
  };
}

function createModelId(prefix: string): Id {
  return `${prefix}-${crypto.randomUUID()}`;
}

function touchProject(project: ProjectDto) {
  return {
    ...project.project,
    updatedAt: nowIsoString(),
  };
}

function nowIsoString() {
  return new Date().toISOString();
}
