import client from './client';

export interface SecureNotesStatus {
  is_password_set: boolean;
  failed_attempts: number;
  is_locked: boolean;
  locked_until: string | null;
}

export interface MessageResponse {
  message: string;
}

export const secureNotesApi = {
  /** Fetch secure note security status */
  getStatus: async (): Promise<SecureNotesStatus> => {
    const response = await client.get<SecureNotesStatus>('/api/secure-notes/status');
    return response.data;
  },

  /** Set password for the first time */
  setPassword: async (password: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/secure-notes/set-password', { password });
    return response.data;
  },

  /** Verify secure notes password */
  verifyPassword: async (password: string): Promise<{ status: string; message: string }> => {
    const response = await client.post<{ status: string; message: string }>('/api/secure-notes/verify-password', { password });
    return response.data;
  },

  /** Change secure password */
  changePassword: async (currentPassword: string, newPassword: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/secure-notes/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /** Request OTP to reset secure password */
  sendResetOtp: async (): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/secure-notes/send-reset-otp');
    return response.data;
  },

  /** Verify reset OTP */
  verifyResetOtp: async (code: string): Promise<{ status: string; message: string }> => {
    const response = await client.post<{ status: string; message: string }>('/api/secure-notes/verify-reset-otp', { code });
    return response.data;
  },

  /** Reset secure password using OTP */
  resetPassword: async (code: string, newPassword: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/secure-notes/reset-password', {
      code,
      new_password: newPassword,
    });
    return response.data;
  },

  /** Disable secure notes protection */
  disableProtection: async (password: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/secure-notes/disable', { password });
    return response.data;
  },
} as const;
