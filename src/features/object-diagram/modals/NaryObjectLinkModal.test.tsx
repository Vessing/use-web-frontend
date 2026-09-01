import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, snapshotCommandApi } from '../../../api';
import type { ProjectDto } from '../../../api/dtos';
import { appStoreActions } from '../../../state';
import { NaryObjectLinkModal } from './NaryObjectLinkModal';

afterEach(() => { vi.restoreAllMocks(); appStoreActions.reset(); });

describe('NaryObjectLinkModal', () => {
  it('creates a complete n-ary link through the snapshot command and reloads', async () => {
    const project = fixture();
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(snapshotCommandApi, 'createObjectLink').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_OBJECT_LINK', revisionScope: 'SNAPSHOT', revision: '19', result: request.draft, affectedElements: [] }));
    render(<NaryObjectLinkModal modal={{ type: 'addObjectAssociation', associationId: 'association-attends' }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.selectOptions(screen.getAllByLabelText('Object')[1], 'course-db');
    await userEvent.type(screen.getByLabelText('semester / Integer'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Create Object Link' }));

    expect(create).toHaveBeenCalledWith('project-library', { expectedRevision: '18', draft: expect.objectContaining({ associationId: 'association-attends', endValues: [expect.objectContaining({ associationEndId: 'end-student', objectId: 'student-ada' }), expect.objectContaining({ associationEndId: 'end-course', objectId: 'course-db', qualifierValues: [{ qualifierId: 'qualifier-semester', value: { type: 'Integer', value: 3 } }] }), expect.objectContaining({ associationEndId: 'end-term', objectId: 'term-winter' })] }) });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('retains all assignments after a stale snapshot revision', async () => {
    const project = fixture();
    vi.spyOn(snapshotCommandApi, 'createObjectLink').mockRejectedValue(new ApiClientError(409, { code: 'STALE_SNAPSHOT_REVISION', message: 'Stale', userMessage: 'The snapshot changed.', timestamp: '', details: { draft: {} } }));
    render(<NaryObjectLinkModal modal={{ type: 'addObjectAssociation', associationId: 'association-attends' }} project={project} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.selectOptions(screen.getAllByLabelText('Object')[1], 'course-db');
    await userEvent.type(screen.getByLabelText('semester / Integer'), '4');
    await userEvent.click(screen.getByRole('button', { name: 'Create Object Link' }));

    expect(await screen.findByText(/STALE_SNAPSHOT_REVISION/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Object')[1]).toHaveValue('course-db');
    expect(screen.getByLabelText('semester / Integer')).toHaveValue('4');
  });

  it('creates an Association-Class link and owned Object atomically', async () => {
    const project = fixture();
    project.umlModel.classes.push({ id: 'class-attendance', name: 'Attendance', attributes: [{ id: 'attribute-grade', name: 'grade', type: 'Real' }], operations: [] });
    project.umlModel.associations[0].associationClassId = 'class-attendance';
    const refresh = vi.fn().mockResolvedValue(true);
    const create = vi.spyOn(snapshotCommandApi, 'createAssociationClassInstance').mockImplementation(async (_projectId, request) => ({ command: 'CREATE_ASSOCIATION_CLASS_INSTANCE', revisionScope: 'SNAPSHOT', revision: '19', result: { link: request.draft.link, associationClassObject: { ...request.draft.associationClassObject, slots: [] } }, affectedElements: [] }));
    render(<NaryObjectLinkModal modal={{ type: 'addObjectAssociation', associationId: 'association-attends' }} project={project} expectedRevision="18" onRefreshProject={refresh} />);

    await userEvent.selectOptions(screen.getAllByLabelText('Object')[1], 'course-db');
    await userEvent.type(screen.getByLabelText('semester / Integer'), '3');
    await userEvent.type(screen.getByLabelText('Link and Object Name'), 'attendanceAda');
    await userEvent.type(screen.getByLabelText('grade / Real'), '1.7');
    await userEvent.click(screen.getByRole('button', { name: 'Create Object Link' }));

    expect(create).toHaveBeenCalledWith('project-library', { expectedRevision: '18', draft: { link: expect.objectContaining({ associationId: 'association-attends', name: 'attendanceAda', associationClassObjectId: expect.any(String) }), associationClassObject: expect.objectContaining({ name: 'attendanceAda', classId: 'class-attendance', slots: [expect.objectContaining({ attributeId: 'attribute-grade', value: { type: 'Real', value: 1.7 }, isUnset: false })] }) } });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('retains the complete Association-Class instance draft after a revision conflict', async () => {
    const project = fixture();
    project.umlModel.classes.push({ id: 'class-attendance', name: 'Attendance', attributes: [{ id: 'attribute-grade', name: 'grade', type: 'Real' }], operations: [] });
    project.umlModel.associations[0].associationClassId = 'class-attendance';
    vi.spyOn(snapshotCommandApi, 'createAssociationClassInstance').mockRejectedValue(new ApiClientError(409, { code: 'STALE_SNAPSHOT_REVISION', message: 'Stale', userMessage: 'The snapshot changed.', timestamp: '', details: { draft: {} } }));
    render(<NaryObjectLinkModal modal={{ type: 'addObjectAssociation', associationId: 'association-attends' }} project={project} expectedRevision="18" onRefreshProject={vi.fn().mockResolvedValue(true)} />);

    await userEvent.selectOptions(screen.getAllByLabelText('Object')[1], 'course-db');
    await userEvent.type(screen.getByLabelText('semester / Integer'), '4');
    await userEvent.type(screen.getByLabelText('Link and Object Name'), 'attendanceDraft');
    await userEvent.type(screen.getByLabelText('grade / Real'), '2.3');
    await userEvent.click(screen.getByRole('button', { name: 'Create Object Link' }));

    expect(await screen.findByText(/STALE_SNAPSHOT_REVISION/)).toBeInTheDocument();
    expect(screen.getByLabelText('Link and Object Name')).toHaveValue('attendanceDraft');
    expect(screen.getByLabelText('grade / Real')).toHaveValue('2.3');
    expect(screen.getAllByLabelText('Object')[1]).toHaveValue('course-db');
  });
});

function fixture(): ProjectDto {
  const multiplicity = { lower: 1, upper: 1, unbounded: false, raw: '1' };
  return { formatVersion: '1.0', project: { id: 'project-library', name: 'Library', createdAt: '', updatedAt: '' }, umlModel: { classes: [{ id: 'class-student', name: 'Student', attributes: [], operations: [] }, { id: 'class-course', name: 'Course', attributes: [], operations: [] }, { id: 'class-term', name: 'Term', attributes: [], operations: [] }], invariants: [], associations: [{ id: 'association-attends', name: 'Attends', associationClassId: null, ends: [{ id: 'end-student', classId: 'class-student', roleName: 'student', multiplicity, navigable: true, qualifiers: [] }, { id: 'end-course', classId: 'class-course', roleName: 'course', multiplicity, navigable: true, qualifiers: [{ id: 'qualifier-semester', name: 'semester', type: 'Integer', order: 0 }] }, { id: 'end-term', classId: 'class-term', roleName: 'term', multiplicity, navigable: true, qualifiers: [] }] }] }, objectModel: { id: 'snapshot-current', name: 'Current', objects: [{ id: 'student-ada', name: 'ada', classId: 'class-student', slots: [] }, { id: 'course-uml', name: 'uml', classId: 'class-course', slots: [] }, { id: 'course-db', name: 'db', classId: 'class-course', slots: [] }, { id: 'term-winter', name: 'winter', classId: 'class-term', slots: [] }], links: [] }, layout: { classDiagram: { nodes: [], edges: [] }, objectDiagram: { nodes: [], edges: [] }, updatedAt: '' } };
}
