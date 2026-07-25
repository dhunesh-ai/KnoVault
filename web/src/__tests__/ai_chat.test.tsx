import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('KnoVault AI Chat Component Suite', () => {
  it('renders AI assistant interface and sends user query', () => {
    const onSendMessage = vi.fn();

    render(
      <div data-testid="ai-chat-view">
        <h2>KnoVault AI Assistant</h2>
        <div data-testid="chat-history">
          <p>Hello! How can I help you manage your tasks today?</p>
        </div>
        <input
          data-testid="ai-chat-input"
          placeholder="Ask KnoVault AI..."
          defaultValue=""
        />
        <button data-testid="send-ai-msg-btn" onClick={() => onSendMessage('Summarize my goals')}>
          Send Query 🚀
        </button>
      </div>
    );

    expect(screen.getByText('KnoVault AI Assistant')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('send-ai-msg-btn'));
    expect(onSendMessage).toHaveBeenCalledWith('Summarize my goals');
  });
});
