import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, modelCommandApi } from '../../../api';
import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { AssociationPropertiesPanel } from './AssociationPropertiesPanel';

afterEach(() => {
  vi.restoreAllMocks();
  appStoreActions.reset();
});

describe('AssociationPropertiesPanel', () => {
  it('saves aggregation and an existing Association Class in the complete association command', async () => {
    const project = fixture();
    project.umlModel.classes.push({ id: 'class-enrollment', name: 'Enrollment', attributes: [], operations: [] });
    const update = vi.spyOn(modelCommandApi, 'updateAssociation').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.selectOptions(screen.getByLabelText('Association Class'), 'class-enrollment');
    await userEvent.selectOptions(screen.getAllByLabelText('Aggregation')[0], 'COMPOSITE');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', 'association-enrollment', {
      expectedRevision: '18',
      draft: expect.objectContaining({
        associationClassId: 'class-enrollment',
        ends: expect.arrayContaining([expect.objectContaining({ id: 'end-student', aggregationKind: 'COMPOSITE' })]),
      }),
    });
  });

  it('creates and binds an Association Class atomically with its initial features', async () => {
    const project = fixture();
    project.umlModel.packages = [{ id: 'package-academic', qualifiedName: 'Academic' }];
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(modelCommandApi, 'createAssociationClass').mockImplementation(async (_projectId, _associationId, request) => ({ command: 'CREATE_ASSOCIATION_CLASS', revisionScope: 'MODEL', revision: '19', result: { association: { ...project.umlModel.associations[0], associationClassId: request.draft.id }, associationClass: request.draft }, affectedElements: [] }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={refresh} />);

    await userEvent.click(screen.getByRole('button', { name: 'Create Association Class' }));
    const dialog = screen.getByRole('dialog', { name: 'Create Association Class' });
    await userEvent.type(within(dialog).getByLabelText('Class Name'), 'Enrollment');
    await userEvent.selectOptions(within(dialog).getByLabelText('Namespace'), 'package-academic');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Attribute' }));
    await userEvent.type(within(dialog).getByLabelText('Attribute 1 Name'), 'grade');
    await userEvent.selectOptions(within(dialog).getByLabelText('Type'), 'Real');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Operation' }));
    await userEvent.type(within(dialog).getByLabelText('Operation 1 Name'), 'passed');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create Association Class' }));

    expect(create).toHaveBeenCalledWith('project-library', 'association-enrollment', { expectedRevision: '18', draft: expect.objectContaining({ name: 'Enrollment', packageId: 'package-academic', qualifiedName: 'Academic::Enrollment', attributes: [expect.objectContaining({ name: 'grade', type: 'Real' })], operations: [expect.objectContaining({ name: 'passed' })] }) });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('saves association-end semantics as one backend association update', async () => {
    const project = fixture();
    const association = project.umlModel.associations[0];
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(modelCommandApi, 'updateAssociation').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));

    render(<AssociationPropertiesPanel project={project} association={association} readVersion="18" onRefreshProject={refresh} />);
    expect(screen.getAllByText('Provided after backend validation')).toHaveLength(2);
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Ordered' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', 'association-enrollment', {
      expectedRevision: '18',
      draft: expect.objectContaining({
        ends: expect.arrayContaining([expect.objectContaining({ id: 'end-student', ordered: true, unique: true })]),
      }),
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(await screen.findByText(/saved at model revision 19/)).toBeInTheDocument();
  });

  it('loads structured delete impact before enabling deletion', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'getDeleteImpact').mockResolvedValue({
      revisionScope: 'MODEL', revision: '18', blocked: true,
      target: { referenceId: 'target', elementType: 'ASSOCIATION', elementId: 'association-enrollment', elementName: 'Enrollment', relation: 'TARGET', cascadeAllowed: false },
      references: [{ referenceId: 'inv-1', elementType: 'INVARIANT', elementId: 'inv-1', elementName: 'HasEnrollment', relation: 'REFERENCES', cascadeAllowed: false }],
    });
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('HasEnrollment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Association' })).toBeDisabled();
  });

  it('adds a qualifier with a stable id and order to an association end', async () => {
    const project = fixture();
    const update = vi.spyOn(modelCommandApi, 'updateAssociation').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole('button', { name: /End 1: Student/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Qualifier' }));
    await userEvent.type(screen.getByLabelText('Qualifier 1 name'), 'matriculationNumber');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', 'association-enrollment', {
      expectedRevision: '18',
      draft: expect.objectContaining({
        ends: expect.arrayContaining([expect.objectContaining({
          id: 'end-student',
          qualifiers: [expect.objectContaining({ name: 'matriculationNumber', order: 0 })],
        })]),
      }),
    });
  });

  it('keeps the complete draft and marks a structured association-end diagnostic', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updateAssociation').mockRejectedValue(new ApiClientError(400, {
      code: 'ASSOCIATION_END_UNIQUE_CONFLICT', message: 'Unique conflict', userMessage: 'Existing links are not unique.', timestamp: '',
      details: { draft: project.umlModel.associations[0], associationEndId: 'end-student', targets: [{ elementType: 'ASSOCIATION_END', elementId: 'end-student', path: 'ends.end-student.unique' }] },
    }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const ordered = screen.getAllByRole('checkbox', { name: 'Ordered' })[0];
    await userEvent.click(ordered);
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText(/Existing links are not unique/)).toBeInTheDocument();
    expect(ordered).toBeChecked();
    expect(screen.getByText(/ASSOCIATION_END_UNIQUE_CONFLICT/)).toBeInTheDocument();
    expect(ordered.closest('.association-end-card')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the edited draft after a stale model revision', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updateAssociation').mockRejectedValue(new ApiClientError(409, {
      code: 'STALE_MODEL_REVISION', message: 'Stale revision', userMessage: 'The model changed.', timestamp: '',
      details: { expectedRevision: '18', actualRevision: '19', draft: project.umlModel.associations[0] },
    }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const name = screen.getByLabelText('Association Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Enrollment Draft');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText(/STALE_MODEL_REVISION/)).toBeInTheDocument();
    expect(name).toHaveValue('Enrollment Draft');
  });

  it('marks the complete association when a structured diagnostic targets the association', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updateAssociation').mockRejectedValue(new ApiClientError(400, {
      code: 'COMMAND_VALIDATION_FAILED', message: 'Duplicate role names', userMessage: 'Association ends must have distinct role names.', timestamp: '',
      details: { draft: project.umlModel.associations[0], targets: [{ elementType: 'ASSOCIATION', elementId: 'association-enrollment', path: 'umlModel.associations' }] },
    }));
    const { container } = render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Ordered' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText(/COMMAND_VALIDATION_FAILED/)).toBeInTheDocument();
    expect(container.querySelector('.association-properties')).toHaveAttribute('aria-invalid', 'true');
  });

  it('allows a multiplicity to be replaced through an intermediate invalid value', async () => {
    const project = fixture();
    const update = vi.spyOn(modelCommandApi, 'updateAssociation').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const multiplicity = screen.getAllByLabelText('Multiplicity')[0];
    await userEvent.clear(multiplicity);
    expect(screen.getByRole('button', { name: 'Apply Changes' })).toBeDisabled();
    await userEvent.type(multiplicity, '0..*');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', 'association-enrollment', expect.objectContaining({
      draft: expect.objectContaining({ ends: expect.arrayContaining([expect.objectContaining({ id: 'end-student', multiplicity: expect.objectContaining({ raw: '0..*' }) })]) }),
    }));
  });

  it('submits every F4 association and end field in one complete draft', async () => {
    const project = fixture();
    const update = vi.spyOn(modelCommandApi, 'updateAssociation').mockImplementation(async (_projectId, _id, request) => ({ command: 'UPDATE_ASSOCIATION', revisionScope: 'MODEL', revision: '19', result: request.draft, affectedElements: [] }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const name = screen.getByLabelText('Association Name');
    await userEvent.clear(name); await userEvent.type(name, 'Enrollment Updated');
    await userEvent.selectOptions(screen.getAllByLabelText('Classifier')[0], 'class-course');
    const role = screen.getAllByLabelText('Role Name')[0];
    await userEvent.clear(role); await userEvent.type(role, 'participants');
    const multiplicity = screen.getAllByLabelText('Multiplicity')[0];
    await userEvent.clear(multiplicity); await userEvent.type(multiplicity, '0..*');
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Navigable' })[0]);
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Ordered' })[0]);
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Unique' })[0]);
    await userEvent.click(screen.getByRole('button', { name: /End 1: Course/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Derived' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Union' }));
    const referenceChecks = screen.getAllByRole('checkbox', { name: 'Enrollment / course' });
    await userEvent.click(referenceChecks[0]);
    await userEvent.click(referenceChecks[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Add Qualifier' }));
    await userEvent.type(screen.getByLabelText('Qualifier 1 name'), 'semester');
    await userEvent.selectOptions(screen.getByLabelText('Qualifier 1 type'), 'Integer');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(update).toHaveBeenCalledWith('project-library', 'association-enrollment', {
      expectedRevision: '18',
      draft: expect.objectContaining({
        name: 'Enrollment Updated',
        ends: expect.arrayContaining([expect.objectContaining({
          id: 'end-student', classId: 'class-course', roleName: 'participants',
          multiplicity: expect.objectContaining({ raw: '0..*' }),
          navigable: false, ordered: true, unique: false, derived: true, union: true,
          subsettedEndIds: ['end-course'], redefinedEndIds: ['end-course'],
          qualifiers: [expect.objectContaining({ name: 'semester', type: 'Integer', order: 0 })],
        })]),
      }),
    });
  });

  it('keeps the draft when the association no longer exists', async () => {
    const project = fixture();
    vi.spyOn(modelCommandApi, 'updateAssociation').mockRejectedValue(new ApiClientError(404, {
      code: 'ELEMENT_NOT_FOUND', message: 'Association not found', userMessage: 'The association no longer exists.', timestamp: '',
      details: { draft: project.umlModel.associations[0], elementType: 'ASSOCIATION', elementId: 'association-enrollment' },
    }));
    render(<AssociationPropertiesPanel project={project} association={project.umlModel.associations[0]} readVersion="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const name = screen.getByLabelText('Association Name');
    await userEvent.clear(name); await userEvent.type(name, 'Unsaved Association');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText(/ELEMENT_NOT_FOUND/)).toBeInTheDocument();
    expect(name).toHaveValue('Unsaved Association');
  });
});

function fixture(): ProjectDto {
  const multiplicity = { lower: 1, upper: 1, unbounded: false, raw: '1' };
  return {
    formatVersion: '1.0',
    project: { id: 'project-library', name: 'Library', createdAt: '', updatedAt: '' },
    umlModel: {
      classes: [{ id: 'class-student', name: 'Student', attributes: [], operations: [] }, { id: 'class-course', name: 'Course', attributes: [], operations: [] }],
      invariants: [],
      associations: [{
        id: 'association-enrollment', name: 'Enrollment', associationClassId: null,
        ends: [
          { id: 'end-student', classId: 'class-student', roleName: 'student', multiplicity, navigable: true, ordered: false, unique: true, derived: false, union: false, subsettedEndIds: [], redefinedEndIds: [], navigationType: null, qualifiers: [], aggregationKind: 'NONE' },
          { id: 'end-course', classId: 'class-course', roleName: 'course', multiplicity, navigable: true, ordered: false, unique: true, derived: false, union: false, subsettedEndIds: [], redefinedEndIds: [], navigationType: null, qualifiers: [], aggregationKind: 'NONE' },
        ],
      }],
    },
    objectModel: { id: 'snapshot-current', name: 'Current', objects: [], links: [] },
    layout: { classDiagram: { nodes: [], edges: [] }, objectDiagram: { nodes: [], edges: [] }, updatedAt: '' },
  };
}
