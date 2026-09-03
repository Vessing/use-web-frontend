import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ApplyModelTextResponseDto, ProjectDto } from '../../../api';
import { OclEditorView } from '../components/OclEditorView';

describe('OclEditorView', () => {
  it('shows the editable model text and applies changes through the backend API', async () => {
    const user = userEvent.setup();
    const project = createProject();
    const updatedProject = {
      ...project,
      modelText: {
        projectId: 'project-library',
        modelText: 'model Library\nclass User\nend\n',
        format: 'USE_MODEL_TEXT',
        version: '2',
      },
    };
    const applyModelText = vi.fn(async (): Promise<ApplyModelTextResponseDto> => ({
      success: true,
      status: 'APPLIED',
      project: updatedProject,
      modelText: updatedProject.modelText,
      diagnostics: [],
      changedElementIds: ['class-user'],
    }));
    const onProjectChange = vi.fn();
    const onRefreshProject = vi.fn().mockResolvedValue(true);

    render(
      <OclEditorView
        projectId="project-library"
        project={project}
        isLoading={false}
        error={null}
        onProjectChange={onProjectChange}
        onRefreshProject={onRefreshProject}
        applyModelText={applyModelText}
        loadComplianceProfile={loadProfile}
      />,
    );

    const editor = screen.getByLabelText('USE model text');
    expect((editor as HTMLTextAreaElement).value).toContain('context User inv maxBooks:');

    await user.type(editor, '{Enter}-- changed in editor');
    await user.click(screen.getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => {
      expect(applyModelText).toHaveBeenCalledWith(
        'project-library',
        expect.objectContaining({
          sourceName: 'Library.use',
          sourceOrigin: 'ocl-editor',
          modelText: expect.stringContaining('-- changed in editor'),
        }),
      );
    });
    expect(onProjectChange).toHaveBeenCalledWith(updatedProject);
    expect(onRefreshProject).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Changes applied. 1 model element(s) updated.');
    expect(screen.getByLabelText('OCL Console')).toHaveTextContent('Apply APPLIED');
  });

  it('shows backend diagnostics returned by the model text apply endpoint', async () => {
    const user = userEvent.setup();
    const project = createProject();
    const applyModelText = vi.fn(async (): Promise<ApplyModelTextResponseDto> => ({
      success: false,
      status: 'NOT_APPLIED',
      project,
      modelText: {
        projectId: 'project-library',
        modelText: 'model Library',
        format: 'USE_MODEL_TEXT',
      },
      diagnostics: [
        {
          code: 'SYNTAX_ERROR',
          severity: 'ERROR',
          message: 'Expected end after class declaration.',
        },
      ],
      changedElementIds: [],
    }));

    render(
      <OclEditorView
        projectId="project-library"
        project={project}
        isLoading={false}
        error={null}
        onProjectChange={() => undefined}
        applyModelText={applyModelText}
        loadComplianceProfile={loadProfile}
      />,
    );

    await user.type(screen.getByLabelText('USE model text'), '{Enter}broken');
    await user.click(screen.getByRole('button', { name: 'Apply Changes' }));

    expect(await screen.findByText(/SYNTAX_ERROR/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Changes' })).toBeEnabled();
  });

  it('updates backend-rendered model text when the project is refreshed', () => {
    const project = createProject();
    const onProjectChange = vi.fn();
    const { rerender } = render(
      <OclEditorView
        projectId="project-library"
        project={project}
        isLoading={false}
        error={null}
        onProjectChange={onProjectChange}
        loadComplianceProfile={loadProfile}
      />,
    );

    expect((screen.getByLabelText('USE model text') as HTMLTextAreaElement).value).toContain(
      'books : Integer',
    );

    rerender(
      <OclEditorView
        projectId="project-library"
        project={{
          ...project,
          umlModel: {
            ...project.umlModel,
            classes: project.umlModel.classes.map((umlClass) =>
              umlClass.id === 'class-user'
                ? {
                    ...umlClass,
                    attributes: [
                      ...umlClass.attributes,
                      { id: 'attr-name', name: 'name', type: 'String' },
                    ],
                  }
                : umlClass,
            ),
          },
          modelText: {
            projectId: 'project-library',
            modelText: 'model Library\n\nclass User\nattributes\n  books : Integer\n  name : String\nend\n',
            format: 'USE_MODEL_TEXT',
          },
        }}
        isLoading={false}
        error={null}
        onProjectChange={onProjectChange}
        loadComplianceProfile={loadProfile}
      />,
    );

    expect((screen.getByLabelText('USE model text') as HTMLTextAreaElement).value).toContain(
      'name : String',
    );
  });

  it('preserves imported USE source when an updated project is received', () => {
    const importedText = '-- Original header\nmodel Employee\n\nclass Person end\n';
    const project = {
      ...createProject(),
      project: { ...createProject().project, updatedAt: '2026-09-03T10:00:00.000Z' },
      modelText: {
        projectId: 'project-library',
        modelText: importedText,
        format: 'USE_MODEL_TEXT',
        updatedAt: '2026-09-03T09:00:00.000Z',
      },
    };

    render(
      <OclEditorView
        projectId="project-library"
        project={project}
        isLoading={false}
        error={null}
        onProjectChange={vi.fn()}
        loadComplianceProfile={loadProfile}
      />,
    );

    expect(screen.getByLabelText('USE model text')).toHaveValue(importedText);
  });
});

function createProject(): ProjectDto {
  return {
    formatVersion: '1.0',
    project: {
      id: 'project-library',
      name: 'Library',
    },
    modelText: {
      projectId: 'project-library',
      modelText: 'model Library\n\nclass User\nattributes\n  books : Integer\nend\n\nconstraints\ncontext User inv maxBooks:\n  self.books <= 5\n',
      format: 'USE_MODEL_TEXT',
    },
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
        },
      ],
    },
    objectModel: {
      id: 'snapshot-current',
      objects: [],
      links: [],
    },
    layout: {
      classDiagram: { nodes: [] },
      objectDiagram: { nodes: [] },
    },
  };
}

const loadProfile = async () => ({
  profileId: 'test-profile',
  oclVersion: '2.4',
  complianceClaim: 'Test subset',
  apiVersion: 'v1',
  enabledOptionalCompliancePoints: [],
  features: [{ id: 'OCL-PROFILE-001', group: 'Core', status: 'SUPPORTED' as const, standardBasis: 'Clause 8', notes: 'Supported in tests.' }],
  runtimeLimits: { maxTokens: 10000 },
});
