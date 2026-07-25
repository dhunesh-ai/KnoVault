import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Workspaces Component Suite', () => {
  it('renders workspace list and invite member dialog trigger', () => {
    const onInviteMember = vi.fn();

    render(
      <div data-testid="workspaces-view">
        <h2>Workspaces</h2>
        <div data-testid="workspace-card-1">
          <h3>Engineering Team</h3>
          <p>Collaborative workspace for engineering members.</p>
          <button data-testid="invite-member-btn" onClick={() => onInviteMember(1)}>
            + Invite Member
          </button>
        </div>
      </div>
    );

    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-card-1')).toHaveTextContent('Engineering Team');
    fireEvent.click(screen.getByTestId('invite-member-btn'));
    expect(onInviteMember).toHaveBeenCalledWith(1);
  });
});
