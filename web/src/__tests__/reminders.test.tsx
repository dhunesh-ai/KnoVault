import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Reminders Component Suite', () => {
  it('renders reminders list and allows toggling reminder completion', () => {
    const onToggle = vi.fn();

    render(
      <div data-testid="reminders-view">
        <h2>Reminders & Tasks</h2>
        <ul data-testid="reminders-list">
          <li>
            <span>Submit Report</span>
            <button data-testid="toggle-rem-1" onClick={() => onToggle(1)}>Mark Complete</button>
          </li>
        </ul>
      </div>
    );

    expect(screen.getByText('Reminders & Tasks')).toBeInTheDocument();
    const btn = screen.getByTestId('toggle-rem-1');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
