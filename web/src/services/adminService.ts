import { getApiBaseUrl } from '../lib/axios';

const getBaseUrl = () => getApiBaseUrl();

function getAdminToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('knovault_admin_token');
  }
  return null;
}

async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
      localStorage.removeItem('knovault_admin_token');
      localStorage.removeItem('knovault_admin_user');
      window.location.href = '/admin/login';
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || `Error ${res.status}`);
  }

  return res.json();
}

export const adminService = {
  // Auth
  async login(email: string, password: string, otp_code?: string) {
    const data = await adminFetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp_code }),
    });
    if (data.access_token) {
      localStorage.setItem('knovault_admin_token', data.access_token);
      localStorage.setItem('knovault_admin_user', JSON.stringify(data.admin_user));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('knovault_admin_token');
    localStorage.removeItem('knovault_admin_user');
    window.location.href = '/admin/login';
  },

  getStoredAdminUser() {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('knovault_admin_user');
      return u ? JSON.parse(u) : null;
    }
    return null;
  },

  // Dashboard & Stats
  async getDashboardStats() {
    return adminFetch('/api/admin/dashboard/stats');
  },

  // Storage Management
  async getStorageStats(page: number = 1, limit: number = 20) {
    return adminFetch(`/api/admin/storage?page=${page}&limit=${limit}`);
  },

  async getUserStorageDetail(userId: number) {
    return adminFetch(`/api/admin/storage/${userId}`);
  },

  // Users
  async getUsers(params: { search?: string; role?: string; status_filter?: string; platform?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status_filter) query.append('status_filter', params.status_filter);
    if (params.platform) query.append('platform', params.platform);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return adminFetch(`/api/admin/users?${query.toString()}`);
  },

  async getUserDetail(userId: number) {
    return adminFetch(`/api/admin/users/${userId}`);
  },

  async blockUser(userId: number, reason: string, block_type: string = 'permanent') {
    return adminFetch(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason, block_type }),
    });
  },

  async unblockUser(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/unblock`, {
      method: 'POST',
    });
  },

  async softDeleteUser(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/soft-delete`, {
      method: 'POST',
    });
  },

  async restoreUser(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/restore`, {
      method: 'POST',
    });
  },

  async permanentDeleteUser(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/permanent`, {
      method: 'DELETE',
    });
  },

  async forceLogoutUser(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/force-logout`, {
      method: 'POST',
    });
  },

  async exportUserData(userId: number) {
    return adminFetch(`/api/admin/users/${userId}/export`);
  },

  async createAdmin(data: { email: string; password: string; full_name: string; role: string }) {
    return adminFetch('/api/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // AI Stats
  async getAIStats() {
    return adminFetch('/api/admin/ai/stats');
  },

  // Announcements
  async sendAnnouncement(data: { title: string; message: string; category: string; target_audience: string; selected_user_ids?: number[] }) {
    return adminFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAnnouncements() {
    return adminFetch('/api/admin/announcements');
  },

  // Feedback
  async getFeedback() {
    return adminFetch('/api/admin/feedback');
  },

  // Analytics & Logs
  async getAnalyticsCharts() {
    return adminFetch('/api/admin/analytics/charts');
  },

  async getSecurityLogs() {
    return adminFetch('/api/admin/security/logs');
  },

  async getAuditLogs() {
    return adminFetch('/api/admin/audit-logs');
  },

  // Settings
  async getSettings() {
    return adminFetch('/api/admin/settings');
  },

  async updateSetting(key: string, value: string, description?: string) {
    return adminFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value, description }),
    });
  },

  // Backup
  async exportBackup() {
    return adminFetch('/api/admin/backup/export', {
      method: 'POST',
    });
  },
};
