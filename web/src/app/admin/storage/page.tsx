'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminService } from '@/services/adminService';
import {
  Database,
  HardDrive,
  User,
  Search,
  Eye,
  RefreshCw,
  FileText,
  Bell,
  Target,
  Gift,
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminStoragePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserStorage, setSelectedUserStorage] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStorageStats(page, 15);
      setData(res);
    } catch (err) {
      console.error('Failed to load storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, [page]);

  const handleInspectUserStorage = async (userId: number) => {
    setDetailLoading(true);
    try {
      const detail = await adminService.getUserStorageDetail(userId);
      setSelectedUserStorage(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredUsers = (data?.users || []).filter((u: any) =>
    search === '' ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Storage Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time breakdown of user storage consumption, quotas, and database resource usage.
          </p>
        </div>
        <button
          onClick={fetchStorageData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Total Storage Consumed</span>
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {formatBytes(data?.grand_total_bytes || 0)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Across all active database accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Standard User Quota</span>
            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">5.00 MB</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Default storage limit per user</p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Active Accounts Monitored</span>
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{data?.total_users || 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Users calculated for quota checks</p>
        </div>
      </div>

      {/* User Storage Table Controls */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* User Storage Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold bg-slate-50 dark:bg-slate-950/80">
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Storage Used</th>
                <th className="py-3 px-3">Quota Limit</th>
                <th className="py-3 px-3">Usage Bar</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading storage consumption records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{u.full_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatBytes(u.storage_used_bytes)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-400 font-medium">
                      {formatBytes(u.limit_bytes)}
                    </td>
                    <td className="py-3.5 px-3 w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{u.percent_used}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div
                            className={`h-full transition-all duration-300 ${
                              u.percent_used > 90
                                ? 'bg-rose-500'
                                : u.percent_used > 70
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(u.percent_used, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInspectUserStorage(u.user_id)}
                          className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-semibold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-500/30"
                        >
                          <Eye className="w-3.5 h-3.5" /> Breakdown
                        </button>
                        <Link
                          href={`/admin/users/${u.user_id}`}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs border border-slate-200 dark:border-slate-700"
                        >
                          User Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Granular Storage Breakdown Modal */}
      {selectedUserStorage && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 text-slate-900 dark:text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Storage Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedUserStorage.full_name} ({selectedUserStorage.email})</p>
              </div>
              <button
                onClick={() => setSelectedUserStorage(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Notes Data
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedUserStorage.breakdown?.notes?.count || 0} items ({formatBytes(selectedUserStorage.breakdown?.notes?.bytes || 0)})
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Reminders Data
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedUserStorage.breakdown?.reminders?.count || 0} items ({formatBytes(selectedUserStorage.breakdown?.reminders?.bytes || 0)})
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Goals Data
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedUserStorage.breakdown?.goals?.count || 0} items ({formatBytes(selectedUserStorage.breakdown?.goals?.bytes || 0)})
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Special Days Data
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedUserStorage.breakdown?.special_days?.count || 0} items ({formatBytes(selectedUserStorage.breakdown?.special_days?.bytes || 0)})
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Workspace Data
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedUserStorage.breakdown?.workspaces?.count || 0} items ({formatBytes(selectedUserStorage.breakdown?.workspaces?.bytes || 0)})
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUserStorage(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
