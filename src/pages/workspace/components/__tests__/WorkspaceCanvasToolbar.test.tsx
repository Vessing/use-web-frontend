import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectDto } from '../../../../api';
import { appStoreActions, getAppState } from '../../../../state';
import { WorkspaceCanvasToolbar } from '../WorkspaceCanvasToolbar';

afterEach(() => {
  appStoreActions.reset();
});

describe('WorkspaceCanvasToolbar', () => {
  it('opens the association modal for a self-association when the model has one class', async () => {
    const user = userEvent.setup();

    render(<WorkspaceCanvasToolbar activeView="class-diagram" project={projectWithOneClass} />);

    const associationButton = screen.getByRole('button', { name: 'Association' });
    expect(associationButton).toBeEnabled();

    await user.click(associationButton);

    expect(getAppState().modal).toEqual({ type: 'addClassAssociation' });
  });
});

const projectWithOneClass: ProjectDto = {
  formatVersion: '1.0',
  project: { id: 'project-library', name: 'Library' },
  umlModel: {
    classes: [{ id: 'class-person', name: 'Person', attributes: [], operations: [] }],
    associations: [],
    invariants: [],
  },
  objectModel: { objects: [], links: [] },
  layout: { classDiagram: { nodes: [] }, objectDiagram: { nodes: [] } },
};
