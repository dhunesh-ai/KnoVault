/**
 * KnoVault — Axios HTTP Client
 *
 * Production API client for Render backend.
 * Automatically attaches JWT bearer tokens from SecureStore.
 * Handles 401 responses with token refresh and auth state cleanup.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';
import { useAppStore } from '../store/appStore';

const client = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const checkHealth = async (): Promise<boolean> => {
  try {
    console.log('[Neon Connection / Health Check] Verifying Render backend and Neon DB...');
    const res = await axios.get(`${env.API_BASE_URL}/health`, { timeout: 15000 });
    if (res.status === 200 && res.data?.database === 'connected') {
      console.log('[Neon Connection / Health Check] OK');
      useAppStore.getState().setBackendDown(false);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Neon Connection / Health Check] Failed:', error);
    return false;
  }
};

// ── Request Interceptor: Attach JWT & Log ───────────────────────────
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log(`[API Initialization] Requesting ${config.method?.toUpperCase()} ${config.url}`);
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore may fail on web — degrade gracefully
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: Handle 401 globally and Refresh Tokens ───
const RETRY_DELAYS = [2000, 4000, 8000];

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retryCount?: number, _retry?: boolean };
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    // Don't trigger token refresh or logout for auth endpoints
    const authEndpoints = ['/api/auth/login', '/api/auth/firebase-sync', '/api/auth/complete-signup'];
    const isAuthEndpoint = authEndpoints.some(ep => originalRequest?.url?.includes(ep));
    
    // Detect Backend / Network Errors for Retry Logic
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.response?.status === 503) {
      if (originalRequest._retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[originalRequest._retryCount];
        console.log(`[API Retry] Request failed. Retrying in ${delay}ms... (Attempt ${originalRequest._retryCount + 1}/${RETRY_DELAYS.length})`);
        originalRequest._retryCount += 1;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(originalRequest);
      } else {
        console.log("[API Client] Backend unreachable after all retries:", error.message);
        useAppStore.getState().setBackendDown(true);
      }
    } else {
      useAppStore.getState().setBackendDown(false);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const refreshResponse = await axios.post(`${env.API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshResponse.status === 200) {
            const { access_token, refresh_token: new_refresh } = refreshResponse.data;
            await SecureStore.setItemAsync('user_token', access_token);
            await SecureStore.setItemAsync('refresh_token', new_refresh);
            
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          }
        }
      } catch (refreshError) {
        const { logout } = (await import('../store/authStore')).useAuthStore.getState();
        await logout();
      }
    } else if (error.response?.status === 401 && !isAuthEndpoint) {
      const { logout } = (await import('../store/authStore')).useAuthStore.getState();
      await logout();
    }

    return Promise.reject(error);
  },
);

export default client;
