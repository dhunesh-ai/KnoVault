import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return 'https://knovault-jbph.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

export const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

export const setAuthCookies = (accessToken: string, refreshToken: string) => {
  Cookies.set('user_token', accessToken, { expires: 7, secure: isHttps, sameSite: 'lax' });
  Cookies.set('refresh_token', refreshToken, { expires: 30, secure: isHttps, sameSite: 'lax' });
};

export const clearAuthCookies = () => {
  Cookies.remove('user_token');
  Cookies.remove('refresh_token');
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach JWT and Dynamic Base URL
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    const token = Cookies.get('user_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const RETRY_DELAYS = [2000, 4000, 8000];

// Response Interceptor: Handle 401 globally and Refresh Tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retryCount?: number; _retry?: boolean };
    
    if (!originalRequest) return Promise.reject(error);
    
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    const authEndpoints = ['/api/auth/login', '/api/auth/firebase-sync', '/api/auth/complete-signup', '/api/auth/me'];
    const isAuthEndpoint = authEndpoints.some(ep => originalRequest?.url?.includes(ep));
    
    // Retry Logic for network errors (bypass for auth endpoints to fail fast)
    if ((error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.response?.status === 503) && !isAuthEndpoint) {
      if (originalRequest._retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[originalRequest._retryCount];
        originalRequest._retryCount += 1;
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }
    
    // Refresh Token Logic
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshToken = Cookies.get('refresh_token');
        if (refreshToken) {
          const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshResponse.status === 200) {
            const { access_token, refresh_token: new_refresh } = refreshResponse.data;
            setAuthCookies(access_token, new_refresh);
            
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        clearAuthCookies();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 401 && !isAuthEndpoint) {
      clearAuthCookies();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
