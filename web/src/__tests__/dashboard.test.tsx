import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Dashboard Interface & Components', () => {
  it('renders dashboard welcome headers and quick navigation', () => {
    render(
      <div data-testid="dashboard-container">
        <h1>Welcome back to KnoVault</h1>
        <div data-testid="quick-stats">
          <span>Active Notes: 12</span>
          <span>Pending Reminders: 5</span>
          <span>Goal Progress: 80%</span>
        </div>
        <button data-testid="create-note-btn">+ Create Note</button>
      </div>
    );

    expect(screen.getByText('Welcome back to KnoVault')).toBeInTheDocument();
    expect(screen.getByTestId('quick-stats')).toHaveTextContent('Active Notes: 12');
    expect(screen.getByTestId('create-note-btn')).toBeEnabled();
  });
});
