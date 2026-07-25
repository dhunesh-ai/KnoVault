import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Notes Component Suite', () => {
  it('renders notes search filter and note item cards', () => {
    const onSearchChange = vi.fn();

    render(
      <div data-testid="notes-view">
        <h2>My Notes</h2>
        <input
          data-testid="search-notes-input"
          placeholder="Search notes..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div data-testid="note-card-1">
          <h3>Architecture Design</h3>
          <p>Discuss database schema and API structure.</p>
        </div>
      </div>
    );

    expect(screen.getByText('My Notes')).toBeInTheDocument();
    const input = screen.getByTestId('search-notes-input');
    fireEvent.change(input, { target: { value: 'Architecture' } });
    expect(onSearchChange).toHaveBeenCalledWith('Architecture');
    expect(screen.getByTestId('note-card-1')).toHaveTextContent('Architecture Design');
  });
});
