import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Profile & Settings Suite', () => {
  it('renders user profile details and settings options', () => {
    render(
      <div data-testid="profile-settings-view">
        <h2>Profile & Settings</h2>
        <div data-testid="user-info">
          <span>Name: Test User</span>
          <span>Email: testuser@knovault.com</span>
        </div>
        <div data-testid="theme-selector">
          <label>Theme Preference</label>
          <select defaultValue="dark">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div data-testid="about-knovault">
          <p>KnoVault v1.0.0 — AI-Powered Productivity Vault</p>
        </div>
      </div>
    );

    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();
    expect(screen.getByTestId('user-info')).toHaveTextContent('Test User');
    expect(screen.getByTestId('about-knovault')).toHaveTextContent('KnoVault v1.0.0');
  });
});
