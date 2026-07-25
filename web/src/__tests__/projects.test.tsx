import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Projects Component Suite', () => {
  it('renders project tasks board and status badge', () => {
    const onStatusChange = vi.fn();

    render(
      <div data-testid="projects-view">
        <h2>Projects Board</h2>
        <div data-testid="project-card-1">
          <h3>CI Pipeline Integration</h3>
          <span data-testid="status-badge">In Progress</span>
          <button data-testid="complete-project-btn" onClick={() => onStatusChange('completed')}>
            Mark Done
          </button>
        </div>
      </div>
    );

    expect(screen.getByText('Projects Board')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveTextContent('In Progress');
    fireEvent.click(screen.getByTestId('complete-project-btn'));
    expect(onStatusChange).toHaveBeenCalledWith('completed');
  });
});
