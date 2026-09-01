import type { ProjectDto, SlotDto, UmlInvariantDto } from '../dtos';

type BackendOclExpressionDto = {
  id?: string | null;
  text?: string | null;
  language?: string | null;
  languageVersion?: string | null;
};

type BackendSlotValueDto = {
  type?: string | null;
  value?: unknown;
};

type BackendInvariantDto = Omit<UmlInvariantDto, 'expression'> & {
  expression: string | BackendOclExpressionDto;
};

type BackendSlotDto = Omit<SlotDto, 'value'> & {
  value: SlotDto['value'] | BackendSlotValueDto;
};

type BackendProjectDto = Omit<ProjectDto, 'umlModel' | 'objectModel'> & {
  umlModel: Omit<ProjectDto['umlModel'], 'invariants' | 'classes'> & {
    classes: Array<ProjectDto['umlModel']['classes'][number] & { abstractClass?: boolean }>;
    invariants: BackendInvariantDto[];
  };
  objectModel: Omit<ProjectDto['objectModel'], 'objects'> & {
    objects: Array<
      Omit<ProjectDto['objectModel']['objects'][number], 'slots'> & {
        slots: BackendSlotDto[];
      }
    >;
  };
};

export function normalizeProjectDto(project: ProjectDto): ProjectDto {
  const backendProject = project as BackendProjectDto;

  return {
    ...project,
    definitions: project.definitions ?? [],
    umlModel: {
      ...project.umlModel,
      packages: backendProject.umlModel.packages ?? [],
      imports: backendProject.umlModel.imports ?? [],
      enumerations: backendProject.umlModel.enumerations ?? [],
      dataTypes: backendProject.umlModel.dataTypes ?? [],
      classes: (backendProject.umlModel.classes ?? []).map((umlClass) => ({
        ...umlClass,
        abstract: umlClass.abstractClass ?? umlClass.abstract ?? false,
        superClassIds: umlClass.superClassIds ?? [],
        visibility: umlClass.visibility ?? 'PUBLIC',
        packageId: umlClass.packageId ?? null,
        qualifiedName: umlClass.qualifiedName ?? umlClass.name,
        attributes: (umlClass.attributes ?? []).map((attribute) => ({
          ...attribute,
          visibility: attribute.visibility ?? 'PUBLIC',
        })),
        operations: (umlClass.operations ?? []).map((operation) => ({
          ...operation,
          visibility: operation.visibility ?? 'PUBLIC',
          query: operation.query ?? operation.isQuery ?? false,
          abstractOperation: operation.abstractOperation ?? false,
          staticOperation: operation.staticOperation ?? false,
          parameters: (operation.parameters ?? [])
            .map((parameter, index) => ({
              ...parameter,
              direction: (parameter.direction ?? 'IN').toUpperCase() as 'IN' | 'OUT' | 'INOUT',
              position: parameter.position ?? index,
            }))
            .sort((left, right) => (left.position ?? 0) - (right.position ?? 0)),
        })),
      })),
      associations: (backendProject.umlModel.associations ?? []).map((association) => ({
        ...association,
        associationClassId: association.associationClassId ?? null,
        ends: (association.ends ?? []).map((end) => ({
          ...end,
          navigable: end.navigable ?? false,
          ordered: end.ordered ?? false,
          unique: end.unique ?? true,
          derived: end.derived ?? false,
          union: end.union ?? false,
          subsettedEndIds: end.subsettedEndIds ?? [],
          redefinedEndIds: end.redefinedEndIds ?? [],
          navigationType: end.navigationType ?? null,
          qualifiers: end.qualifiers ?? [],
          aggregationKind: end.aggregationKind ?? 'NONE',
        })),
      })),
      invariants: (backendProject.umlModel.invariants ?? []).map((invariant) => ({
        ...invariant,
        expression: normalizeInvariantExpression(invariant.expression),
      })),
    },
    objectModel: {
      ...project.objectModel,
      objects: (backendProject.objectModel.objects ?? []).map((object) => ({
        ...object,
        slots: (object.slots ?? []).map(normalizeSlot),
      })),
    },
  };
}

export function toBackendProjectDto(project: ProjectDto): ProjectDto {
  return ({
    ...project,
    umlModel: {
      ...project.umlModel,
      classes: project.umlModel.classes.map((umlClass) => ({
        ...umlClass,
        abstractClass: umlClass.abstract ?? false,
        superClassIds: umlClass.superClassIds ?? [],
      })),
      invariants: project.umlModel.invariants.map((invariant) => ({
        ...invariant,
        expression:
          typeof invariant.expression === 'string'
            ? {
                id: `expr-${invariant.id}`,
                text: invariant.expression,
                language: 'OCL',
                languageVersion: 'MVP',
              }
            : invariant.expression,
      })),
    },
    objectModel: {
      ...project.objectModel,
      objects: project.objectModel.objects.map((object) => ({
        ...object,
        slots: object.slots.map((slot) => ({
          ...slot,
          value:
            isBackendSlotValue(slot.value)
              ? slot.value
              : {
                  type: slot.valueType ?? 'String',
                  value: slot.value,
                },
        })),
      })),
    },
  } as unknown) as ProjectDto;
}

function normalizeInvariantExpression(expression: string | BackendOclExpressionDto) {
  if (typeof expression === 'string') {
    return expression;
  }

  return expression.text ?? '';
}

function normalizeSlot(slot: BackendSlotDto): SlotDto {
  if (!isBackendSlotValue(slot.value)) {
    return slot as SlotDto;
  }

  return {
    ...slot,
    value: slot.value.value as SlotDto['value'],
    valueType: slot.value.type ?? slot.valueType,
  };
}

function isBackendSlotValue(value: unknown): value is BackendSlotValueDto {
  return typeof value === 'object' && value !== null && 'value' in value;
}
