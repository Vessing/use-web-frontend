import type {
  Id,
  ProjectDto,
  UmlAttributeDto,
  UmlClassDto,
  UmlTypeDto,
} from '../../../api/dtos';

interface AddClassInput {
  name: string;
  attributes?: Array<{ name: string; type: UmlTypeDto }>;
  operations?: Array<{ name: string; returnType: UmlTypeDto }>;
  position?: { x: number; y: number };
  visibility?: UmlClassDto['visibility'];
  packageId?: string | null;
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
            visibility: input.visibility ?? 'PUBLIC',
            packageId: input.packageId ?? null,
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
