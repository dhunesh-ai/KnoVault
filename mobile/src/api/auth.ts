/**
 * KnoVault — Auth API Functions
 */
import client from './client';
import type { LoginRequest, RegisterRequest, TokenResponse, MessageResponse, User, CompleteSignupRequest, ResetPasswordRequest } from '../types';

export const authApi = {
  /** Step 1: Initiate signup by sending OTP */
  register: async (data: RegisterRequest): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/auth/send-signup-otp', data);
    return response.data;
  },

  /** Step 3: Complete signup after OTP verification */
  completeSignup: async (data: CompleteSignupRequest): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/complete-signup', data);
    return response.data;
  },

  /** Authenticate and receive JWT */
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/login', data);
    return response.data;
  },

  /** Verify account with OTP */
  verifyOtp: async (email: string, code: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/auth/verify-otp', { email, code });
    return response.data;
  },

  /** Resend verification or reset OTP */
  resendOtp: async (email: string, purpose: string = "verification"): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>(`/api/auth/resend-otp?email=${email}&purpose=${purpose}`);
    return response.data;
  },

  /** Fetch the currently authenticated user's profile */
  getProfile: async (): Promise<User> => {
    const response = await client.get<User>('/api/profile');
    return response.data;
  },

  /** Request a password reset email */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/auth/forgot-password', { email });
    return response.data;
  },

  /** Reset password with OTP */
  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/auth/reset-password', data);
    return response.data;
  },

  /** Refresh access token */
  refreshToken: async (refresh_token: string): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/refresh', { refresh_token });
    return response.data;
  },

  /** Fetch user productivity analytics */
  getAnalytics: async () => {
    const response = await client.get('/api/analytics');
    return response.data;
  },

  // ── Firebase Auth ────────────────────────────────────────────────

  /** Sync Firebase user with KnoVault backend (exchange Firebase token for KnoVault JWT) */
  firebaseSync: async (idToken: string): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/firebase-sync', {
      id_token: idToken,
    });
    return response.data;
  },

  /** Update FCM device token on the backend */
  updateFCMToken: async (fcmToken: string): Promise<MessageResponse> => {
    const response = await client.post<MessageResponse>('/api/auth/fcm-token', {
      fcm_token: fcmToken,
    });
    return response.data;
  },
} as const;
