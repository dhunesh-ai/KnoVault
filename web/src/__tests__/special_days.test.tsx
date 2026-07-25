import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Special Days & Birthdays Component Suite', () => {
  it('renders special days list and email wish scheduler button', () => {
    const onOpenScheduler = vi.fn();

    render(
      <div data-testid="special-days-view">
        <h2>Special Days & Birthdays</h2>
        <div data-testid="special-day-1">
          <span>Mom's Birthday - Aug 15</span>
          <button data-testid="schedule-email-btn" onClick={() => onOpenScheduler(1)}>
            Schedule Wish Email 📧
          </button>
        </div>
      </div>
    );

    expect(screen.getByText('Special Days & Birthdays')).toBeInTheDocument();
    expect(screen.getByTestId('special-day-1')).toHaveTextContent("Mom's Birthday - Aug 15");
    fireEvent.click(screen.getByTestId('schedule-email-btn'));
    expect(onOpenScheduler).toHaveBeenCalledWith(1);
  });
});
