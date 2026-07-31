import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';

const adminAxios = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

adminAxios.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export const adminClient = {
  async login(email: string, password: string, otp_code?: string) {
    const res = await axios.post(`${env.API_BASE_URL}/api/admin/auth/login`, {
      email,
      password,
      otp_code,
    });
    if (res.data?.access_token) {
      await SecureStore.setItemAsync('admin_token', res.data.access_token);
      await SecureStore.setItemAsync('admin_user', JSON.stringify(res.data.admin_user));
    }
    return res.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('admin_token');
    await SecureStore.deleteItemAsync('admin_user');
  },

  async getStoredAdmin() {
    try {
      const u = await SecureStore.getItemAsync('admin_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  async getDashboardStats() {
    const res = await adminAxios.get('/api/admin/dashboard/stats');
    return res.data;
  },

  async getUsers(search?: string, status_filter?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status_filter && status_filter !== 'all') params.append('status_filter', status_filter);
    const res = await adminAxios.get(`/api/admin/users?${params.toString()}`);
    return res.data;
  },

  async getUserDetail(userId: number) {
    const res = await adminAxios.get(`/api/admin/users/${userId}`);
    return res.data;
  },

  async blockUser(userId: number, reason: string, block_type: string = 'permanent') {
    const res = await adminAxios.post(`/api/admin/users/${userId}/block`, { reason, block_type });
    return res.data;
  },

  async unblockUser(userId: number) {
    const res = await adminAxios.post(`/api/admin/users/${userId}/unblock`);
    return res.data;
  },

  async softDeleteUser(userId: number) {
    const res = await adminAxios.post(`/api/admin/users/${userId}/soft-delete`);
    return res.data;
  },

  async sendAnnouncement(title: string, message: string, category: string = 'app_update') {
    const res = await adminAxios.post('/api/admin/announcements', {
      title,
      message,
      category,
      target_audience: 'everyone',
    });
    return res.data;
  },
};
