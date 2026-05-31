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

// ── Request Interceptor: Attach JWT & Log ───────────────────────────
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
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
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Don't trigger token refresh or logout for auth endpoints
    // These are pre-authentication calls where 401 means invalid credentials, not expired session
    const authEndpoints = ['/api/auth/login', '/api/auth/firebase-sync', '/api/auth/complete-signup'];
    const isAuthEndpoint = authEndpoints.some(ep => originalRequest?.url?.includes(ep));
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          // Attempt to refresh the token using a separate axios instance to avoid interceptor loops
          const refreshResponse = await axios.post(`${env.API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshResponse.status === 200) {
            const { access_token, refresh_token: new_refresh } = refreshResponse.data;
            await SecureStore.setItemAsync('user_token', access_token);
            await SecureStore.setItemAsync('refresh_token', new_refresh);
            
            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          }
        }
      } catch (refreshError) {
        // If refresh fails, clear everything
        const { logout } = (await import('../store/authStore')).useAuthStore.getState();
        await logout();
      }
    } else if (error.response?.status === 401 && !isAuthEndpoint) {
      // Direct 401 without refresh possibility - clear state
      const { logout } = (await import('../store/authStore')).useAuthStore.getState();
      await logout();
    }
    
    // Detect Backend / Network Errors
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      console.log("[API Client] Backend unreachable:", error.message);
      useAppStore.getState().setBackendDown(true);
    } else {
      useAppStore.getState().setBackendDown(false);
    }

    return Promise.reject(error);
  },
);

export default client;
