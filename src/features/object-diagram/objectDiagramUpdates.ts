import type { Id, ObjectLinkDto, ProjectDto, SlotDto, UmlClassDto } from '../../api/dtos';

interface AddObjectInput {
  name: string;
  classId: Id;
  position?: { x: number; y: number };
}

interface AddObjectLinkInput {
  associationId: Id;
  sourceObjectId: Id;
  targetObjectId: Id;
}

interface AddObjectResult {
  project: ProjectDto;
  createdId: Id;
}

export function addObject(project: ProjectDto, input: AddObjectInput): AddObjectResult {
  const objectId = createModelId('object');
  const umlClass = project.umlModel.classes.find(
    (candidate) => candidate.id === input.classId,
  );

  return {
    createdId: objectId,
    project: {
      ...project,
      project: touchProject(project),
      objectModel: {
        ...project.objectModel,
        objects: [
          ...project.objectModel.objects,
          {
            id: objectId,
            name: input.name.trim(),
            classId: input.classId,
            slots: createUnsetSlots(umlClass),
          },
        ],
      },
      layout: {
        ...project.layout,
        objectDiagram: {
          ...project.layout.objectDiagram,
          nodes: [
            ...project.layout.objectDiagram.nodes,
            {
              elementId: objectId,
              x: input.position?.x ?? 140 + project.objectModel.objects.length * 40,
              y: input.position?.y ?? 120 + project.objectModel.objects.length * 30,
            },
          ],
        },
        updatedAt: nowIsoString(),
      },
    },
  };
}

export function addObjectLink(
  project: ProjectDto,
  input: AddObjectLinkInput,
): AddObjectResult {
  const linkId = createModelId('link');
  const association = project.umlModel.associations.find(
    (candidate) => candidate.id === input.associationId,
  );
  const [sourceEnd, targetEnd] = association?.ends ?? [];

  return {
    createdId: linkId,
    project: {
      ...project,
      project: touchProject(project),
      objectModel: {
        ...project.objectModel,
        links: [
          ...project.objectModel.links,
          {
            id: linkId,
            associationId: input.associationId,
            endValues:
              sourceEnd && targetEnd
                ? [
                    { associationEndId: sourceEnd.id, objectId: input.sourceObjectId },
                    { associationEndId: targetEnd.id, objectId: input.targetObjectId },
                  ]
                : [],
          },
        ],
      },
    },
  };
}

export function appendObjectLink(project: ProjectDto, link: ObjectLinkDto): ProjectDto {
  return {
    ...project,
    project: touchProject(project),
    objectModel: {
      ...project.objectModel,
      links: [
        ...project.objectModel.links.filter((existing) => existing.id !== link.id),
        link,
      ],
    },
  };
}

export function updateObject(
  project: ProjectDto,
  objectId: Id,
  patch: { name?: string; classId?: Id },
): ProjectDto {
  return {
    ...project,
    project: touchProject(project),
    objectModel: {
      ...project.objectModel,
      objects: project.objectModel.objects.map((object) =>
        object.id === objectId ? { ...object, ...patch } : object,
      ),
    },
  };
}

export function updateSlotValue(
  project: ProjectDto,
  objectId: Id,
  slotId: Id,
  patch: Pick<SlotDto, 'value' | 'valueType'> & Partial<Pick<SlotDto, 'isUnset'>>,
): ProjectDto {
  return {
    ...project,
    project: touchProject(project),
    objectModel: {
      ...project.objectModel,
      objects: project.objectModel.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              slots: object.slots.map((slot) =>
                slot.id === slotId ? { ...slot, ...patch } : slot,
              ),
            }
          : object,
      ),
    },
  };
}

export function updateSlotValueByAttribute(
  project: ProjectDto,
  objectId: Id,
  attribute: { id: Id; type: SlotDto['valueType'] },
  patch: Pick<SlotDto, 'value' | 'valueType'> & Partial<Pick<SlotDto, 'isUnset'>>,
): ProjectDto {
  return {
    ...project,
    project: touchProject(project),
    objectModel: {
      ...project.objectModel,
      objects: project.objectModel.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        const existingSlot = object.slots.find((slot) => slot.attributeId === attribute.id);

        if (!existingSlot) {
          return {
            ...object,
            slots: [
              ...object.slots,
              {
                id: createModelId('slot'),
                attributeId: attribute.id,
                value: patch.value,
                valueType: patch.valueType ?? attribute.type,
                isUnset: patch.isUnset,
              },
            ],
          };
        }

        return {
          ...object,
          slots: object.slots.map((slot) =>
            slot.id === existingSlot.id ? { ...slot, ...patch } : slot,
          ),
        };
      }),
    },
  };
}

export function updateObjectLink(
  project: ProjectDto,
  linkId: Id,
  updater: (link: ObjectLinkDto) => ObjectLinkDto,
): ProjectDto {
  return {
    ...project,
    project: touchProject(project),
    objectModel: {
      ...project.objectModel,
      links: project.objectModel.links.map((link) =>
        link.id === linkId ? updater(link) : link,
      ),
    },
  };
}

export function updateObjectLinkEnd(
  project: ProjectDto,
  linkId: Id,
  associationEndId: Id,
  objectId: Id,
): ProjectDto {
  return updateObjectLink(project, linkId, (link) => ({
    ...link,
    endValues: link.endValues.map((endValue) =>
      endValue.associationEndId === associationEndId
        ? { ...endValue, objectId }
        : endValue,
    ),
  }));
}

function createUnsetSlots(umlClass: UmlClassDto | undefined) {
  return (umlClass?.attributes ?? []).map((attribute) => ({
    id: createModelId('slot'),
    attributeId: attribute.id,
    value: null,
    valueType: attribute.type,
    isUnset: true,
  }));
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
