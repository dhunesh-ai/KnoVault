'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminService } from '@/services/adminService';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  UserMinus,
  Shield,
  Trash2,
  RotateCcw,
  Eye,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Block Modal state
  const [selectedUserForBlock, setSelectedUserForBlock] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('Policy Violation');
  const [blockType, setBlockType] = useState('permanent');

  // Action message state
  const [actionMessage, setActionMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        search,
        status_filter: statusFilter === 'all' ? undefined : statusFilter,
        role: roleFilter || undefined,
        platform: platformFilter || undefined,
        page,
        limit: 15,
      });
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
      setTotalUsers(data.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, roleFilter, platformFilter, page]);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBlock) return;
    try {
      await adminService.blockUser(selectedUserForBlock.id, blockReason, blockType);
      setActionMessage(`User ${selectedUserForBlock.email} blocked successfully.`);
      setSelectedUserForBlock(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Block failed');
    }
  };

  const handleUnblock = async (user: any) => {
    if (!confirm(`Unblock account for ${user.email}?`)) return;
    try {
      await adminService.unblockUser(user.id);
      setActionMessage(`User ${user.email} unblocked.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSoftDelete = async (user: any) => {
    if (!confirm(`Soft-delete account for ${user.email}? The user will be disabled.`)) return;
    try {
      await adminService.softDeleteUser(user.id);
      setActionMessage(`User ${user.email} soft-deleted.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestore = async (user: any) => {
    try {
      await adminService.restoreUser(user.id);
      setActionMessage(`User ${user.email} restored.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePermanentDelete = async (user: any) => {
    if (!confirm(`CRITICAL: Permanently delete ${user.email} and purge ALL associated data? This action CANNOT be undone.`)) return;
    try {
      await adminService.permanentDeleteUser(user.id);
      setActionMessage(`User ${user.email} permanently purged.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">User Management & Moderation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, moderate, block, soft-delete, or audit platform users. Total: {totalUsers}
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by Email, Name, or User ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          {['all', 'active', 'blocked', 'deleted'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                statusFilter === st ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Role Select */}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="user">Standard User</option>
          <option value="moderator">Moderator</option>
          <option value="support_admin">Support Admin</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>

        {/* Platform Select */}
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Platforms</option>
          <option value="web">Web</option>
          <option value="mobile">Mobile</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Platform</th>
                <th className="py-3.5 px-4">Joined / Last Active</th>
                <th className="py-3.5 px-4">Items / Storage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-xs">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{u.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email} &bull; ID: #{u.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {u.is_blocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                          Blocked ({u.block_reason || 'Policy'})
                        </span>
                      ) : u.is_deleted ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                          Soft-Deleted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 capitalize">
                      {u.last_platform || 'web'}
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      <div>Joined: {new Date(u.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500">
                        Active: {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>

                    {/* Metrics Metadata */}
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="font-semibold text-slate-300">
                        {u.notes_count} notes &bull; {u.goals_count} goals &bull; {u.ai_chats_count} AI
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ~{Math.round(u.storage_used_bytes / 1024)} KB stored
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          title="View Profile Metadata"
                        >
                          <Eye size={15} />
                        </Link>

                        {u.is_blocked ? (
                          <button
                            onClick={() => handleUnblock(u)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Unblock User"
                          >
                            <UserCheck size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedUserForBlock(u)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Block User"
                          >
                            <UserX size={15} />
                          </button>
                        )}

                        {u.is_deleted ? (
                          <button
                            onClick={() => handleRestore(u)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Restore Account"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Soft Delete User"
                          >
                            <UserMinus size={15} />
                          </button>
                        )}

                        <button
                          onClick={() => handlePermanentDelete(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Permanently Purge Data"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages} &bull; Showing {users.length} of {totalUsers} users
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* BLOCK MODAL */}
      {selectedUserForBlock && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Block User: {selectedUserForBlock.email}</span>
              </div>
              <button onClick={() => setSelectedUserForBlock(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Block</label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="Spam">Spam Activity</option>
                  <option value="Abuse">Abusive Content / Harassment</option>
                  <option value="Fake Account">Fake / Bot Account</option>
                  <option value="Policy Violation">Terms of Service Violation</option>
                  <option value="Security Issue">Compromised Security Risk</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Block Duration</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="permanent">Permanent Block</option>
                  <option value="temporary">Temporary Block (30 Days)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserForBlock(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Confirm Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
