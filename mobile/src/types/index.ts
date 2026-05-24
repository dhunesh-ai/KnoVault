/**
 * KnoVault — Type Definitions
 */

// ── User ────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_verified: boolean;
  created_at: string;
  firebase_uid?: string | null;
}

// ── Auth ────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupInitRequest {
  email: string;
  full_name: string;
}

export interface CompleteSignupRequest {
  email: string;
  code: string;
  password: string;
}

export interface RegisterRequest extends SignupInitRequest {}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface MessageResponse {
  message: string;
  detail?: string;
  purpose?: string;
}

// ── Firebase Auth ───────────────────────────────────────────────────
export interface FirebaseSyncRequest {
  id_token: string;
}

export interface FCMTokenRequest {
  fcm_token: string;
}

// ── API Error ───────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  status?: number;
}
