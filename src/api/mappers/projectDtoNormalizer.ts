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
  umlModel: Omit<ProjectDto['umlModel'], 'invariants'> & {
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
    umlModel: {
      ...project.umlModel,
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
