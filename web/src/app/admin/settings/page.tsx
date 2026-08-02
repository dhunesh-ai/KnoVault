'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Settings, Shield, UserPlus, Save, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function SystemSettingsPage() {
  const [settingsMap, setSettingsMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Create Admin Form state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [adminMsg, setAdminMsg] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettingsMap(data || {});
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingUpdate = async (key: string, value: string, desc?: string) => {
    try {
      await adminService.updateSetting(key, value, desc);
      setMsg(`Setting ${key} updated successfully.`);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg('');
    try {
      const res = await adminService.createAdmin({
        email: newAdminEmail,
        password: newAdminPass,
        full_name: newAdminName,
        role: newAdminRole,
      });
      setAdminMsg(res.message);
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPass('');
    } catch (err: any) {
      alert(err.message || 'Failed to create admin');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading system settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">System Settings & Configuration</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Configure global application parameters, AI settings, storage quotas, and admin roles.</p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Maintenance Mode & Core Toggles */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <AlertOctagon size={18} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">Global Maintenance Mode</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-slate-900 dark:text-slate-200">Enable Platform Maintenance Mode</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Restricts non-admin users from accessing mobile and web applications.</p>
          </div>
          <button
            onClick={() => handleSettingUpdate('maintenance_mode', settingsMap.maintenance_mode === 'true' ? 'false' : 'true', 'Global maintenance mode toggle')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              settingsMap.maintenance_mode === 'true'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {settingsMap.maintenance_mode === 'true' ? 'MAINTENANCE ACTIVE' : 'SYSTEM NORMAL'}
          </button>
        </div>
      </div>

      {/* AI & Storage Settings */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">Platform & AI Config</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default AI Model</label>
            <input
              type="text"
              value={settingsMap.ai_model || 'gpt-oss-20b'}
              onChange={(e) => setSettingsMap({ ...settingsMap, ai_model: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono"
            />
            <button
              onClick={() => handleSettingUpdate('ai_model', settingsMap.ai_model)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shadow-sm"
            >
              Save Model
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Max Storage Per User (MB)</label>
            <input
              type="text"
              value={settingsMap.max_storage_per_user_mb || '500'}
              onChange={(e) => setSettingsMap({ ...settingsMap, max_storage_per_user_mb: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono"
            />
            <button
              onClick={() => handleSettingUpdate('max_storage_per_user_mb', settingsMap.max_storage_per_user_mb)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shadow-sm"
            >
              Save Quota
            </button>
          </div>
        </div>
      </div>

      {/* CREATE ADMIN (Super Admin Only) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <UserPlus size={18} className="text-purple-600 dark:text-purple-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">Create Admin Account (Super Admin Privilege)</h2>
        </div>

        {adminMsg && <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{adminMsg}</div>}

        <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="Administrator Name"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@knovault.app"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={newAdminPass}
              onChange={(e) => setNewAdminPass(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="support_admin">Support Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30">
              Create Admin User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
