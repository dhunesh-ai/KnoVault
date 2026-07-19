import api from "@/lib/axios";

export interface SecureNotesStatus {
  is_password_set: boolean;
  failed_attempts: number;
  is_locked: boolean;
  locked_until: string | null;
}

export const secureNotesService = {
  getStatus: async (): Promise<SecureNotesStatus> => {
    const response = await api.get<SecureNotesStatus>("/api/secure-notes/status");
    return response.data;
  },

  setPassword: async (password: string) => {
    const response = await api.post("/api/secure-notes/set-password", { password });
    return response.data;
  },

  verifyPassword: async (password: string) => {
    const response = await api.post("/api/secure-notes/verify-password", { password });
    return response.data;
  },

  sendResetOtp: async () => {
    const response = await api.post("/api/secure-notes/send-reset-otp");
    return response.data;
  },

  verifyResetOtp: async (code: string) => {
    const response = await api.post("/api/secure-notes/verify-reset-otp", { code });
    return response.data;
  },

  resetPassword: async (code: string, newPassword: string) => {
    const response = await api.post("/api/secure-notes/reset-password", {
      code,
      new_password: newPassword,
    });
    return response.data;
  },

  disableProtection: async (password: string) => {
    const response = await api.post("/api/secure-notes/disable", { password });
    return response.data;
  },
};
