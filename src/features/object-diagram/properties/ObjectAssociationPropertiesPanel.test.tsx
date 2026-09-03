import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, snapshotCommandApi } from '../../../api';
import type { ObjectLinkDeleteImpactDto, ProjectDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { ObjectAssociationPropertiesPanel } from './ObjectAssociationPropertiesPanel';

afterEach(() => { vi.restoreAllMocks(); appStoreActions.reset(); });

describe('ObjectAssociationPropertiesPanel', () => {
  it('updates shared Association-Class end assignments and owned values atomically', async () => {
    const project = fixture();
    project.umlModel.classes.push({ id: 'class-enrollment', name: 'Enrollment', attributes: [{ id: 'attribute-grade', name: 'grade', type: 'Real' }], operations: [] });
    project.umlModel.associations[0].associationClassId = 'class-enrollment';
    project.objectModel.objects.push({ id: 'enrollment-object', name: 'enrollmentAda', classId: 'class-enrollment', slots: [{ id: 'slot-grade', attributeId: 'attribute-grade', value: 1.7, valueType: 'Real' }] });
    project.objectModel.links[0].associationClassObjectId = 'enrollment-object';
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(snapshotCommandApi, 'updateAssociationClassInstance').mockImplementation(async (_projectId, _linkId, request) => ({ command: 'UPDATE_ASSOCIATION_CLASS_INSTANCE', revisionScope: 'SNAPSHOT', revision: '19', result: { link: request.draft.link, associationClassObject: { ...request.draft.associationClassObject, slots: [] } }, affectedElements: [] }));
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={refresh} />);

    expect(screen.getByText('Shared Association-Class identity')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Owned Values' }));
    const grade = screen.getByLabelText('grade : Real');
    expect(grade).toHaveValue(1.7);
    await userEvent.clear(grade); await userEvent.type(grade, '2.0');
    await userEvent.click(screen.getByRole('tab', { name: 'End Assignments' }));
    await userEvent.selectOptions(screen.getAllByLabelText('Assigned Object')[0], 'student-bob');
    await userEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

    expect(update).toHaveBeenCalledWith('project-library', 'link-enrollment', { expectedRevision: '18', draft: { link: expect.objectContaining({ associationClassObjectId: 'enrollment-object', endValues: expect.arrayContaining([expect.objectContaining({ associationEndId: 'end-student', objectId: 'student-bob' })]) }), associationClassObject: expect.objectContaining({ id: 'enrollment-object', classId: 'class-enrollment', slots: [expect.objectContaining({ attributeId: 'attribute-grade', value: { type: 'Real', value: 2 }, isUnset: false })] }) } });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('retains an invalid owned-value draft and marks the targeted slot', async () => {
    const project = fixture();
    project.umlModel.classes.push({ id: 'class-enrollment', name: 'Enrollment', attributes: [{ id: 'attribute-grade', name: 'grade', type: 'Real' }], operations: [] });
    project.umlModel.associations[0].associationClassId = 'class-enrollment';
    project.objectModel.objects.push({ id: 'enrollment-object', name: 'enrollmentAda', classId: 'class-enrollment', slots: [{ id: 'slot-grade', attributeId: 'attribute-grade', value: 1.7, valueType: 'Real' }] });
    project.objectModel.links[0].associationClassObjectId = 'enrollment-object';
    vi.spyOn(snapshotCommandApi, 'updateAssociationClassInstance').mockRejectedValue(new ApiClientError(400, { code: 'INVALID_SLOT_VALUE', message: 'Invalid slot', userMessage: 'The grade is invalid.', timestamp: '', details: { draft: {}, targets: [{ elementType: 'SLOT', elementId: 'attribute-grade', path: 'associationClassObject.slots.attribute-grade.value' }] } }));
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Owned Values' }));
    const grade = screen.getByLabelText('grade : Real');
    await userEvent.clear(grade); await userEvent.type(grade, '2.3');
    await userEvent.click(screen.getByRole('button', { name: 'Save Instance' }));

    expect((await screen.findAllByText(/INVALID_SLOT_VALUE/)).length).toBeGreaterThan(0);
    expect(grade).toHaveValue(2.3);
    expect(grade).toHaveAttribute('aria-invalid', 'true');
  });

  it('updates every end and qualifier as one revision-protected link draft', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const update = vi.spyOn(snapshotCommandApi, 'updateObjectLink').mockImplementation(async (_projectId, _linkId, request) => ({ command: 'UPDATE_OBJECT_LINK', revisionScope: 'SNAPSHOT', revision: '19', result: request.draft, affectedElements: [] }));
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.selectOptions(screen.getAllByLabelText('Assigned Object')[0], 'student-bob');
    const qualifier = screen.getByLabelText('matriculationNo : String');
    await userEvent.clear(qualifier); await userEvent.type(qualifier, 'S-2000');
    await userEvent.click(screen.getByRole('button', { name: 'Save Assignments' }));

    expect(update).toHaveBeenCalledWith('project-library', 'link-enrollment', { expectedRevision: '18', draft: expect.objectContaining({ id: 'link-enrollment', endValues: expect.arrayContaining([expect.objectContaining({ associationEndId: 'end-student', objectId: 'student-bob', qualifierValues: [expect.objectContaining({ qualifierId: 'qualifier-number', value: { type: 'String', value: 'S-2000' } })] })]) }) });
    expect(refresh).toHaveBeenCalledOnce();
    expect(await screen.findByText(/snapshot revision 19/)).toBeInTheDocument();
  });

  it('retains the full draft and marks the targeted end after validation', async () => {
    const project = fixture();
    vi.spyOn(snapshotCommandApi, 'updateObjectLink').mockRejectedValue(new ApiClientError(400, { code: 'INVALID_LINK', message: 'Invalid link', userMessage: 'The assignment is invalid.', timestamp: '', details: { draft: project.objectModel.links[0], targets: [{ elementType: 'ASSOCIATION_END', elementId: 'end-student', path: 'endValues.end-student.objectId' }] } }));
    const { container } = render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const assignedObjects = screen.getAllByLabelText('Assigned Object');
    await userEvent.selectOptions(assignedObjects[0], 'student-bob');
    await userEvent.click(screen.getByRole('button', { name: 'Save Assignments' }));

    expect((await screen.findAllByText(/INVALID_LINK/)).length).toBeGreaterThan(0);
    expect(assignedObjects[0]).toHaveValue('student-bob');
    expect(container.querySelector('.object-link-end-card')).toHaveAttribute('aria-invalid', 'true');
  });

  it('retains the complete draft when the object link no longer exists', async () => {
    const project = fixture();
    vi.spyOn(snapshotCommandApi, 'updateObjectLink').mockRejectedValue(new ApiClientError(404, {
      code: 'ELEMENT_NOT_FOUND',
      message: 'Object link not found',
      userMessage: 'The object link no longer exists.',
      timestamp: '',
      details: { draft: project.objectModel.links[0] },
    }));
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    const assignedObject = screen.getAllByLabelText('Assigned Object')[0];
    const qualifier = screen.getByLabelText('matriculationNo : String');
    await userEvent.selectOptions(assignedObject, 'student-bob');
    await userEvent.clear(qualifier);
    await userEvent.type(qualifier, 'S-4040');
    await userEvent.click(screen.getByRole('button', { name: 'Save Assignments' }));

    expect(await screen.findByText(/ELEMENT_NOT_FOUND/)).toBeInTheDocument();
    expect(assignedObject).toHaveValue('student-bob');
    expect(qualifier).toHaveValue('S-4040');
  });

  it('loads impact and submits explicit allowed cascades', async () => {
    const project = fixture();
    const impact = deleteImpact(project);
    vi.spyOn(snapshotCommandApi, 'getObjectLinkDeleteImpact').mockResolvedValue(impact);
    const remove = vi.spyOn(snapshotCommandApi, 'deleteObjectLink').mockResolvedValue({ command: 'DELETE_OBJECT_LINK', revisionScope: 'SNAPSHOT', revision: '20', result: null, affectedElements: [] });
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Link' }));
    const cascade = await screen.findByRole('checkbox', { name: /Enrollment identity/ });
    expect(screen.getByRole('button', { name: 'Delete Object Link' })).toBeDisabled();
    await userEvent.click(cascade);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Object Link' }));

    expect(remove).toHaveBeenCalledWith('project-library', 'link-enrollment', { expectedRevision: '18', cascadeReferenceIds: ['cascade-link-object'] });
  });

  it('keeps delete disabled when impact contains a blocker', async () => {
    const project = fixture();
    vi.spyOn(snapshotCommandApi, 'getObjectLinkDeleteImpact').mockResolvedValue({ ...deleteImpact(project), blocked: true, blockers: [{ referenceId: 'blocking-link', elementType: 'OBJECT_LINK', elementId: 'audit-link', elementName: 'Audit enrollment', relation: 'REFERENCES', cascadeAllowed: false }] });
    render(<ObjectAssociationPropertiesPanel project={project} link={project.objectModel.links[0]} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Link' }));
    expect(await screen.findByText('Audit enrollment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Object Link' })).toBeDisabled();
  });
});

function deleteImpact(project: ProjectDto): ObjectLinkDeleteImpactDto {
  return { revisionScope: 'SNAPSHOT', revision: '18', target: { referenceId: 'target-link', elementType: 'OBJECT_LINK', elementId: 'link-enrollment', elementName: 'Enrollment link', relation: 'TARGET', cascadeAllowed: false }, currentLink: project.objectModel.links[0], context: project.umlModel.associations[0].ends.map((end) => ({ referenceId: `context-${end.id}`, elementType: 'ASSOCIATION_END', elementId: end.id, elementName: end.roleName ?? end.id, relation: 'END', cascadeAllowed: false })), blockers: [], allowedCascades: [{ referenceId: 'cascade-link-object', elementType: 'OBJECT', elementId: 'enrollment-object', elementName: 'Enrollment identity', relation: 'ASSOCIATION_CLASS_IDENTITY', cascadeAllowed: true }], validationTargets: [], blocked: false };
}

function fixture(): ProjectDto {
  const multiplicity = { lower: 1, upper: 1, unbounded: false, raw: '1' };
  return { formatVersion: '1.0', project: { id: 'project-library', name: 'Library', createdAt: '', updatedAt: '' }, umlModel: { classes: [{ id: 'class-student', name: 'Student', attributes: [], operations: [] }, { id: 'class-course', name: 'Course', attributes: [], operations: [] }], invariants: [], associations: [{ id: 'association-enrollment', name: 'Enrollment', associationClassId: null, ends: [{ id: 'end-student', classId: 'class-student', roleName: 'student', multiplicity, navigable: true, ordered: false, unique: true, qualifiers: [{ id: 'qualifier-number', name: 'matriculationNo', type: 'String', order: 0 }] }, { id: 'end-course', classId: 'class-course', roleName: 'course', multiplicity, navigable: true, ordered: true, unique: true, qualifiers: [] }] }] }, objectModel: { id: 'snapshot-current', name: 'Current', objects: [{ id: 'student-ada', name: 'ada', classId: 'class-student', slots: [] }, { id: 'student-bob', name: 'bob', classId: 'class-student', slots: [] }, { id: 'course-uml', name: 'uml', classId: 'class-course', slots: [] }], links: [{ id: 'link-enrollment', associationId: 'association-enrollment', endValues: [{ associationEndId: 'end-student', objectId: 'student-ada', qualifierValues: [{ qualifierId: 'qualifier-number', value: { type: 'String', value: 'S-1000' } }] }, { associationEndId: 'end-course', objectId: 'course-uml', qualifierValues: [] }] }] }, layout: { classDiagram: { nodes: [], edges: [] }, objectDiagram: { nodes: [], edges: [] }, updatedAt: '' } };
}
