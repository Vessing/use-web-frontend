import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ProjectDto, ValidationResultDto } from '../../../../api';
import { appStoreActions, getAppState } from '../../../../state';
import { ValidationResultsPanel } from '../ValidationResultsPanel';

describe('ValidationResultsPanel', () => {
  beforeEach(() => {
    appStoreActions.reset();
  });

  it('shows an empty state before the first validation run', () => {
    render(<ValidationResultsPanel validation={getAppState().validation} />);

    expect(screen.getByText('No validation run yet.')).toBeInTheDocument();
    expect(screen.getByText(/Use Check Constraints/)).toBeInTheDocument();
  });

  it('shows a valid state with summary counts and no errors', () => {
    appStoreActions.setValidationResult({
      status: 'VALID',
      summary: {
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [],
      warnings: [],
      infos: [],
    });

    render(<ValidationResultsPanel validation={getAppState().validation} />);

    expect(screen.getByText('VALID')).toBeInTheDocument();
    expect(screen.getByText('No validation issues found.')).toBeInTheDocument();
    expect(screen.getByLabelText('Validation summary')).toHaveTextContent('Errors0');
  });

  it('shows validation errors with details and maps a click to selection state', async () => {
    const user = userEvent.setup();
    appStoreActions.setValidationResult(createInvalidResult());

    render(
      <ValidationResultsPanel
        validation={getAppState().validation}
        project={createProjectFixture()}
      />,
    );

    expect(screen.getByText('INVALID')).toBeInTheDocument();
    expect(screen.getByText('INVARIANT_VIOLATION')).toBeInTheDocument();
    expect(
      screen.getByText('Invariant maxBooks on User failed for object alice : User.'),
    ).toBeInTheDocument();
    expect(screen.getByText('alice verletzt die Invariante maxBooks.')).toBeInTheDocument();
    expect(screen.getByText('Invariant: maxBooks on User')).toBeInTheDocument();
    expect(screen.getByText('Object: alice : User')).toBeInTheDocument();
    expect(screen.getByText('Class: User')).toBeInTheDocument();
    expect(screen.getByText('Expression: self.books <= 5')).toBeInTheDocument();
    expect(screen.queryByText(/Targets:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/obj-alice/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /INVARIANT_VIOLATION/ }));

    expect(getAppState().validation.selectedErrorId).toBe('err-maxbooks-alice');
    expect(getAppState().selection).toEqual({
      view: 'object-diagram',
      type: 'object',
      id: 'obj-alice',
    });
  });

  it('maps syntax errors to the OCL invariant selection', async () => {
    const user = userEvent.setup();
    appStoreActions.setValidationResult({
      status: 'ERROR',
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
      errors: [
        {
          id: 'err-ocl-syntax',
          code: 'SYNTAX_ERROR',
          severity: 'ERROR',
          message: 'Unexpected end of expression.',
          invariantId: 'inv-max-books',
          expression: 'self.books <=',
          targets: [{ elementType: 'OCL_EXPRESSION', elementId: 'inv-max-books' }],
        },
      ],
      warnings: [],
      infos: [],
    });

    render(<ValidationResultsPanel validation={getAppState().validation} />);

    await user.click(screen.getByRole('button', { name: /SYNTAX_ERROR/ }));

    expect(getAppState().selection).toEqual({
      view: 'ocl',
      type: 'invariant',
      id: 'inv-max-books',
    });
  });
});

function createInvalidResult(): ValidationResultDto {
  return {
    status: 'INVALID',
    summary: {
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      checkedInvariantCount: 1,
      checkedObjectCount: 2,
    },
    errors: [
      {
        id: 'err-maxbooks-alice',
        code: 'INVARIANT_VIOLATION',
        severity: 'ERROR',
        message: 'Invariant maxBooks evaluated to false for alice.',
        userMessage: 'alice verletzt die Invariante maxBooks.',
        contextClassId: 'class-user',
        contextObjectId: 'obj-alice',
        invariantId: 'inv-max-books',
        expression: 'self.books <= 5',
        targets: [
          { elementType: 'OBJECT', elementId: 'obj-alice' },
          { elementType: 'INVARIANT', elementId: 'inv-max-books' },
        ],
        details: {
          invariantName: 'maxBooks',
          contextObjectName: 'alice',
          actualValue: false,
          leftValue: 6,
          rightValue: 5,
        },
        suggestedFix: 'Setze books auf einen Wert kleiner oder gleich 5.',
      },
    ],
    warnings: [],
    infos: [],
  };
}

function createProjectFixture(): ProjectDto {
  return {
    formatVersion: '1.0',
    project: {
      id: 'project-library',
      name: 'Library',
    },
    umlModel: {
      classes: [
        {
          id: 'class-user',
          name: 'User',
          attributes: [
            {
              id: 'attr-books',
              name: 'books',
              type: 'Integer',
            },
          ],
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
      name: 'Current Snapshot',
      objects: [
        {
          id: 'obj-alice',
          name: 'alice',
          classId: 'class-user',
          slots: [
            {
              id: 'slot-books',
              attributeId: 'attr-books',
              value: 6,
              valueType: 'Integer',
            },
          ],
        },
      ],
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
  };
}
