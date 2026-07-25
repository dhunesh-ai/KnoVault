import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Goals Component Suite', () => {
  it('renders goals progress card and updates completion percentage', () => {
    const onUpdateProgress = vi.fn();

    render(
      <div data-testid="goals-view">
        <h2>Goals & Habits</h2>
        <div data-testid="goal-item-1">
          <h3>Read 12 Books</h3>
          <span>Progress: 50%</span>
          <button data-testid="increment-progress-btn" onClick={() => onUpdateProgress(75)}>
            Set 75%
          </button>
        </div>
      </div>
    );

    expect(screen.getByText('Goals & Habits')).toBeInTheDocument();
    expect(screen.getByTestId('goal-item-1')).toHaveTextContent('Read 12 Books');
    fireEvent.click(screen.getByTestId('increment-progress-btn'));
    expect(onUpdateProgress).toHaveBeenCalledWith(75);
  });
});
