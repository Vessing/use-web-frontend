import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('shows the loaded project name instead of the technical project id', () => {
    renderWithProviders(
      <TopBar
        projectId="project-5221d485-c8cc-4238-a552-bf0359326729"
        projectName="Library Model"
        activeView="class-diagram"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText('Library Model')).toBeInTheDocument();
    expect(screen.queryByText('project-5221d485-c8cc-4238-a552-bf0359326729')).not.toBeInTheDocument();
  });

  it('navigates back to the dashboard when the app logo is clicked', async () => {
    window.history.pushState(null, '', '/projects/library-demo/class-diagram');

    renderWithProviders(
      <TopBar
        projectId="library-demo"
        projectName="Library Demo"
        activeView="class-diagram"
        onRefresh={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Go to dashboard' }));

    expect(window.location.pathname).toBe('/dashboard');
  });

  it('opens contextual help, traps focus, and restores it after Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TopBar
        projectId="library-demo"
        projectName="Library Demo"
        activeView="object-diagram"
        onRefresh={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open Object Diagram help' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Object Diagram help' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
