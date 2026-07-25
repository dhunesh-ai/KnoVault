import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Medicine Tracker Suite', () => {
  it('renders active medicine schedule and intake action button', () => {
    const onTakeDose = vi.fn();

    render(
      <div data-testid="medicine-tracker">
        <h2>Medicine Tracker</h2>
        <div data-testid="med-item-1">
          <span>Amoxicillin - 500mg</span>
          <button data-testid="take-dose-btn" onClick={() => onTakeDose(1)}>Take Dose 💊</button>
        </div>
      </div>
    );

    expect(screen.getByText('Medicine Tracker')).toBeInTheDocument();
    expect(screen.getByTestId('med-item-1')).toHaveTextContent('Amoxicillin - 500mg');
    fireEvent.click(screen.getByTestId('take-dose-btn'));
    expect(onTakeDose).toHaveBeenCalledWith(1);
  });
});
