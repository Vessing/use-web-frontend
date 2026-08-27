import { describe, expect, it } from 'vitest';

import { ApiClientError } from './client/apiError';
import { createHttpClient } from './client/httpClient';
import type { HttpClient } from './client/httpClient';
import type { ProjectDto, ValidationRequestDto } from './dtos';
import { getProjectId } from './mappers/projectMapper';
import { createProjectApi } from './services/projectApi';
import { createObjectModelApi } from './services/objectModelApi';
import { createUmlApi } from './services/umlApi';
import { createValidationApi } from './services/validationApi';

describe('API client and DTO contracts', () => {
  it('extracts a project id from the backend ProjectDto shape', () => {
    const project = createProjectFixture('Untitled Model');

    expect(project).toMatchObject<ProjectDto>({
      formatVersion: '1.0',
      project: {
        id: 'untitled-model',
        name: 'Untitled Model',
      },
      umlModel: {
        classes: [],
        associations: [],
        invariants: [],
      },
      objectModel: {
        id: 'snapshot-current',
        name: 'Current Snapshot',
        objects: [],
        links: [],
      },
      layout: {
        classDiagram: {
          nodes: [],
          edges: [],
        },
        objectDiagram: {
          nodes: [],
          edges: [],
        },
      },
    });
    expect(getProjectId(project)).toBe('untitled-model');
  });

  it('uses REST project endpoints through the project API service', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const project = createProjectFixture('Library');
    const client: HttpClient = {
      get: async <TResponse>(path: string) => {
        calls.push({ method: 'GET', path });
        return project as TResponse;
      },
      post: async <TResponse, TRequest = unknown>(path: string, body?: TRequest) => {
        calls.push({ method: 'POST', path, body });
        if (path.endsWith('/model-text/apply')) {
          return {
            success: true,
            status: 'APPLIED',
            project,
            modelText: project.modelText,
            diagnostics: [],
            changedElementIds: [],
          } as TResponse;
        }
        return project as TResponse;
      },
      put: async <TResponse, TRequest = unknown>(path: string, body: TRequest) => {
        calls.push({ method: 'PUT', path, body });
        return project as TResponse;
      },
      delete: async <TResponse>(path: string) => {
        calls.push({ method: 'DELETE', path });
        return project as TResponse;
      },
    };
    const api = createProjectApi(client);

    await api.createProject({ name: 'Library' });
    await api.getProjects();
    await api.getProject('project library');
    await api.saveProject('project-library', project);
    await api.applyModelText('project-library', {
      modelText: 'model Library',
      format: 'USE_MODEL_TEXT',
      mode: 'REPLACE_UML_MODEL',
      includeDiagnostics: true,
      sourceName: 'Library.use',
      sourceFormat: 'use',
      sourceOrigin: 'open-existing',
      baseVersion: null,
    });

    expect(calls).toEqual([
      { method: 'POST', path: '/projects', body: { name: 'Library' } },
      { method: 'GET', path: '/projects' },
      { method: 'GET', path: '/projects/project%20library' },
      { method: 'PUT', path: '/projects/project-library', body: project },
      {
        method: 'POST',
        path: '/projects/project-library/model-text/apply',
        body: {
          modelText: 'model Library',
          format: 'USE_MODEL_TEXT',
          mode: 'REPLACE_UML_MODEL',
          includeDiagnostics: true,
          sourceName: 'Library.use',
          sourceFormat: 'use',
          sourceOrigin: 'open-existing',
          baseVersion: null,
        },
      },
    ]);
  });

  it('maps frontend project DTOs to the use-web-backend project format on save', async () => {
    const calls: Array<{ path: string; body?: ProjectDto }> = [];
    const project: ProjectDto = {
      ...createProjectFixture('Library'),
      umlModel: {
        classes: [
          {
            id: 'class-user',
            name: 'User',
            attributes: [{ id: 'attr-books', name: 'books', type: 'Integer' }],
            operations: [],
          },
        ],
        associations: [],
        invariants: [
          {
            id: 'inv-max-books',
            name: 'maxBooks',
            contextClassId: 'class-user',
            expression: 'self.books <= 5',
            enabled: true,
          },
        ],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [
          {
            id: 'object-alice',
            name: 'alice',
            classId: 'class-user',
            slots: [
              {
                id: 'slot-books',
                attributeId: 'attr-books',
                value: 6,
                valueType: 'Integer',
                isUnset: false,
              },
            ],
          },
        ],
        links: [],
      },
    };
    const client: Pick<HttpClient, 'put'> = {
      put: async <TResponse, TRequest = unknown>(path: string, body: TRequest) => {
        calls.push({ path, body: body as ProjectDto });
        return body as unknown as TResponse;
      },
    };
    const api = createProjectApi(client as HttpClient);

    const saved = await api.saveProject('project-library', project);

    expect(calls[0].path).toBe('/projects/project-library');
    expect(calls[0].body?.umlModel.invariants[0].expression).toEqual({
      id: 'expr-inv-max-books',
      text: 'self.books <= 5',
      language: 'OCL',
      languageVersion: 'MVP',
    });
    expect(calls[0].body?.objectModel.objects[0].slots[0].value).toEqual({
      type: 'Integer',
      value: 6,
    });
    expect(saved.umlModel.invariants[0].expression).toBe('self.books <= 5');
    expect(saved.objectModel.objects[0].slots[0]).toMatchObject({
      value: 6,
      valueType: 'Integer',
    });
  });

  it('uses REST delete endpoints for model and snapshot elements', async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const project = createProjectFixture('Library');
    const client: Pick<HttpClient, 'delete'> = {
      delete: async <TResponse>(path: string) => {
        calls.push({ method: 'DELETE', path });
        return project as TResponse;
      },
    };
    const uml = createUmlApi(client as HttpClient);
    const objectModel = createObjectModelApi(client as HttpClient);

    await uml.deleteClass('project-library', 'class-user');
    await uml.deleteAttribute('project-library', 'class-user', 'attr-books');
    await uml.deleteOperation('project-library', 'class-user', 'op-borrow');
    await uml.deleteAssociation('project-library', 'assoc-borrows');
    await uml.deleteInvariant('project-library', 'inv-max-books');
    await objectModel.deleteObject('project-library', 'object-alice');
    await objectModel.deleteObjectLink('project-library', 'link-borrows-1');

    expect(calls).toEqual([
      { method: 'DELETE', path: '/projects/project-library/classes/class-user' },
      {
        method: 'DELETE',
        path: '/projects/project-library/classes/class-user/attributes/attr-books',
      },
      {
        method: 'DELETE',
        path: '/projects/project-library/classes/class-user/operations/op-borrow',
      },
      { method: 'DELETE', path: '/projects/project-library/associations/assoc-borrows' },
      { method: 'DELETE', path: '/projects/project-library/invariants/inv-max-books' },
      { method: 'DELETE', path: '/projects/project-library/objects/object-alice' },
      { method: 'DELETE', path: '/projects/project-library/links/link-borrows-1' },
    ]);
  });

  it('normalizes project DTOs returned from delete endpoints', async () => {
    const backendProject = {
      ...createProjectFixture('Library'),
      umlModel: {
        classes: [
          {
            id: 'class-user',
            name: 'User',
            attributes: [{ id: 'attr-books', name: 'books', type: 'Integer' }],
            operations: [],
          },
        ],
        associations: [],
        invariants: [
          {
            id: 'inv-max-books',
            name: 'maxBooks',
            contextClassId: 'class-user',
            expression: {
              id: 'expr-inv-max-books',
              text: 'self.books <= 5',
              language: 'OCL',
              languageVersion: 'MVP',
            },
            enabled: true,
          },
        ],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [
          {
            id: 'object-alice',
            name: 'alice',
            classId: 'class-user',
            slots: [
              {
                id: 'slot-books',
                attributeId: 'attr-books',
                value: { type: 'Integer', value: 6 },
                valueType: 'Integer',
                isUnset: false,
              },
            ],
          },
        ],
        links: [],
      },
    } as unknown as ProjectDto;
    const client: Pick<HttpClient, 'delete'> = {
      delete: async <TResponse>() => backendProject as TResponse,
    };
    const uml = createUmlApi(client as HttpClient);
    const objectModel = createObjectModelApi(client as HttpClient);

    const afterAssociationDelete = await uml.deleteAssociation(
      'project-library',
      'assoc-borrows',
    );
    const afterObjectLinkDelete = await objectModel.deleteObjectLink(
      'project-library',
      'link-borrows-1',
    );

    expect(afterAssociationDelete.objectModel.objects[0].slots[0]).toMatchObject({
      value: 6,
      valueType: 'Integer',
    });
    expect(afterAssociationDelete.umlModel.invariants[0].expression).toBe(
      'self.books <= 5',
    );
    expect(afterObjectLinkDelete.objectModel.objects[0].slots[0].value).toBe(6);
  });

  it('sends a default full-project validation request', async () => {
    const calls: Array<{ path: string; body?: ValidationRequestDto }> = [];
    const client: Pick<HttpClient, 'post'> = {
      post: async <TResponse, TRequest = unknown>(path: string, body?: TRequest) => {
        calls.push({ path, body: body as ValidationRequestDto });
        return {
          status: 'VALID',
          summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
          errors: [],
        } as TResponse;
      },
    };

    const api = createValidationApi(client as HttpClient);

    await api.validateProject('project-library');

    expect(calls).toEqual([
      {
        path: '/projects/project-library/validate',
        body: { mode: 'FULL_PROJECT' },
      },
    ]);
  });

  it('normalizes use-web-backend validation findings for frontend state', async () => {
    const client: Pick<HttpClient, 'post'> = {
      post: async <TResponse>() =>
        ({
          id: 'validation-result-1',
          projectId: 'project-library',
          objectModelId: 'snapshot-current',
          status: 'INVALID',
          checkedAt: '2026-07-24T12:00:00Z',
          findings: [
            {
              id: 'err-max-books',
              kind: 'VALIDATION_ERROR',
              code: 'INVARIANT_VIOLATION',
              severity: 'ERROR',
              message: 'Invariant maxBooks is violated for object alice.',
              userMessage: "Das Objekt 'alice' verletzt die Invariante 'maxBooks'.",
              technicalMessage: 'self.books <= 5 evaluated to false.',
              elementType: 'OBJECT',
              elementId: 'object-alice',
              relatedElementIds: ['object-alice'],
              contextClassId: 'class-user',
              contextObjectId: 'object-alice',
              invariantId: 'inv-max-books',
              expression: 'self.books <= 5',
              targets: [{ elementType: 'OBJECT', elementId: 'object-alice' }],
              details: { actualValue: 6 },
              suggestedFix: 'Korrigiere den Objektzustand oder passe die Invariante an.',
            },
            {
              id: 'warn-slot',
              kind: 'VALIDATION_ERROR',
              code: 'INVALID_SLOT_VALUE',
              severity: 'WARNING',
              message: 'Slot value is incomplete.',
              elementType: 'SLOT',
              elementId: 'slot-name',
              targets: [{ elementType: 'SLOT', elementId: 'slot-name' }],
              details: {},
            },
          ],
          summary: { errorCount: 1, warningCount: 1, infoCount: 0 },
        }) as TResponse,
    };
    const api = createValidationApi(client as HttpClient);

    const result = await api.validateProject('project-library');

    expect(result.status).toBe('INVALID');
    expect(result.finishedAt).toBe('2026-07-24T12:00:00Z');
    expect(result.errors).toEqual([
      expect.objectContaining({
        id: 'err-max-books',
        code: 'INVARIANT_VIOLATION',
        severity: 'ERROR',
        contextObjectId: 'object-alice',
        invariantId: 'inv-max-books',
        targets: [{ elementType: 'OBJECT', elementId: 'object-alice' }],
      }),
    ]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        id: 'warn-slot',
        code: 'INVALID_SLOT_VALUE',
        severity: 'WARNING',
      }),
    ]);
    expect(result.infos).toEqual([]);
  });

  it('extracts the project id from use-web-backend ProjectDto responses', () => {
    expect(
      getProjectId({
        formatVersion: '1.0',
        project: {
          id: 'backend-project-id',
          name: 'Backend Project',
        },
        umlModel: {
          classes: [],
          associations: [],
          invariants: [],
        },
        objectModel: {
          id: 'snapshot-current',
          objects: [],
          links: [],
        },
        layout: {
          classDiagram: {
            nodes: [],
          },
          objectDiagram: {
            nodes: [],
          },
        },
      }),
    ).toBe('backend-project-id');
  });

  it('keeps association ends and backend multiplicity metadata for diagram labels', () => {
    const project: ProjectDto = {
      ...createProjectFixture('Library'),
      umlModel: {
        classes: [
          { id: 'class-user', name: 'User', attributes: [], operations: [] },
          { id: 'class-book', name: 'Book', attributes: [], operations: [] },
        ],
        associations: [
          {
            id: 'assoc-borrows',
            name: 'Borrows',
            ends: [
              {
                id: 'end-borrows-user',
                classId: 'class-user',
                roleName: 'borrower',
                multiplicity: {
                  lower: 1,
                  upper: 1,
                  unbounded: false,
                  raw: '1',
                },
                navigable: true,
              },
              {
                id: 'end-borrows-book',
                classId: 'class-book',
                roleName: 'borrowedBooks',
                multiplicity: {
                  lower: 0,
                  upper: null,
                  unbounded: true,
                  raw: '0..*',
                },
                navigable: true,
              },
            ],
          },
        ],
        invariants: [],
      },
      objectModel: {
        id: 'snapshot-current',
        objects: [
          { id: 'object-alice', name: 'alice', classId: 'class-user', slots: [] },
          { id: 'object-book', name: 'mobyDick', classId: 'class-book', slots: [] },
        ],
        links: [
          {
            id: 'link-borrows-1',
            associationId: 'assoc-borrows',
            endValues: [
              { associationEndId: 'end-borrows-user', objectId: 'object-alice' },
              { associationEndId: 'end-borrows-book', objectId: 'object-book' },
            ],
          },
        ],
      },
    };

    const [sourceEnd, targetEnd] = project.umlModel.associations[0].ends;
    const objectLink = project.objectModel.links[0];

    expect(project.umlModel.associations[0].name).toBe('Borrows');
    expect(sourceEnd).toMatchObject({
      roleName: 'borrower',
      multiplicity: { raw: '1', upper: 1, unbounded: false },
    });
    expect(targetEnd).toMatchObject({
      roleName: 'borrowedBooks',
      multiplicity: { raw: '0..*', upper: null, unbounded: true },
    });
    expect(objectLink).toMatchObject({
      associationId: 'assoc-borrows',
      endValues: [
        { associationEndId: 'end-borrows-user', objectId: 'object-alice' },
        { associationEndId: 'end-borrows-book', objectId: 'object-book' },
      ],
    });
  });

  it('normalizes backend API errors from JSON responses', async () => {
    const client = createHttpClient({
      baseUrl: '/api/v1',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found.',
            userMessage: 'Das Projekt konnte nicht gefunden werden.',
            requestId: 'req-1',
            timestamp: '2026-07-22T12:00:00Z',
          }),
          { status: 404, statusText: 'Not Found' },
        ),
    });

    await expect(client.get('/projects/missing')).rejects.toBeInstanceOf(ApiClientError);
    await expect(client.get('/projects/missing')).rejects.toMatchObject({
      status: 404,
      dto: {
        code: 'PROJECT_NOT_FOUND',
        userMessage: 'Das Projekt konnte nicht gefunden werden.',
        requestId: 'req-1',
      },
    });
  });
});

function createProjectFixture(name = 'Untitled Model'): ProjectDto {
  return {
    formatVersion: '1.0',
    project: {
      id: slugProjectId(name),
      name,
      createdAt: '2026-07-22T12:00:00Z',
      updatedAt: '2026-07-22T12:00:00Z',
    },
    umlModel: {
      classes: [],
      associations: [],
      invariants: [],
    },
    objectModel: {
      id: 'snapshot-current',
      name: 'Current Snapshot',
      objects: [],
      links: [],
    },
    layout: {
      classDiagram: {
        nodes: [],
        edges: [],
      },
      objectDiagram: {
        nodes: [],
        edges: [],
      },
    },
    validationState: {
      lastCheckedAt: null,
      status: null,
      summary: undefined,
    },
    extensions: {},
  };
}

function slugProjectId(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}
