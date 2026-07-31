'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminService } from '@/services/adminService';
import {
  User,
  Shield,
  ShieldAlert,
  ArrowLeft,
  FileText,
  Bell,
  Target,
  Cpu,
  Building2,
  HardDrive,
  UserCheck,
  UserX,
  UserMinus,
  RotateCcw,
  Trash2,
  LogOut,
  Download
} from 'lucide-react';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);

  const [userDetail, setUserDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUserDetail(userId);
      setUserDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user metadata profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchDetail();
  }, [userId]);

  const handleAction = async (actionFn: () => Promise<any>, successText: string) => {
    try {
      await actionFn();
      setActionMsg(successText);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Fetching privacy-protected user metadata...</span>
        </div>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="p-8 space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back to User List
        </button>
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error || 'User metadata profile not found.'}
        </div>
      </div>
    );
  }

  const { statistics: stats } = userDetail;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={15} />
          <span>Back to Users List</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction(() => adminService.exportUserData(userId), 'Metadata package exported.')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2"
          >
            <Download size={15} />
            <span>Export User Metadata</span>
          </button>
          <button
            onClick={() => handleAction(() => adminService.forceLogoutUser(userId), 'User sessions revoked.')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-rose-400 flex items-center gap-2"
          >
            <LogOut size={15} />
            <span>Force Logout</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          {actionMsg}
        </div>
      )}

      {/* PRIVACY PROTECTION BANNER (RULE #17 ENFORCEMENT) */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-indigo-300 text-xs">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold">KnoVault Rule #17 Privacy Shield Active</span>
            <p className="text-[11px] text-slate-400">
              Note contents, secure note passwords/ciphers, voice note audio, and AI conversation transcripts are completely hidden from admin endpoints to guarantee end-user privacy.
            </p>
          </div>
        </div>
      </div>

      {/* USER PROFILE HEADER CARD */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-indigo-600/30">
            {userDetail.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">{userDetail.full_name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                userDetail.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                userDetail.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                'bg-slate-800 text-slate-400'
              }`}>
                {userDetail.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{userDetail.email} &bull; User ID: #{userDetail.id}</p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
              <span>Joined: {new Date(userDetail.created_at).toLocaleDateString()}</span>
              <span>Last Platform: <strong className="text-slate-300 uppercase">{userDetail.last_platform || 'web'}</strong></span>
              <span>Last Active: {userDetail.last_active_at ? new Date(userDetail.last_active_at).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Status Badge & Primary Action */}
        <div className="flex items-center gap-3">
          {userDetail.is_blocked ? (
            <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              Blocked ({userDetail.block_reason || 'Policy'})
            </span>
          ) : userDetail.is_deleted ? (
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              Soft-Deleted
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/20">
              Account Active
            </span>
          )}
        </div>
      </div>

      {/* METADATA STATISTICS CARDS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Resource Metadata Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatBox label="Total Notes" value={stats?.notes_count} icon={FileText} color="violet" />
          <StatBox label="Total Goals" value={stats?.goals_count} icon={Target} color="emerald" />
          <StatBox label="Reminders" value={stats?.reminders_count} icon={Bell} color="amber" />
          <StatBox label="Special Days" value={stats?.important_days_count} icon={Shield} color="pink" />
          <StatBox label="AI Chats" value={stats?.ai_chats_count} icon={Cpu} color="indigo" />
          <StatBox label="Workspaces" value={stats?.workspaces_count} icon={Building2} color="sky" />
        </div>
      </div>

      {/* STORAGE BREAKDOWN */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <HardDrive size={18} className="text-indigo-400" />
            <span>Account Storage Quota Usage</span>
          </div>
          <span className="text-xs font-mono text-indigo-400 font-bold">
            ~{Math.round((stats?.storage_used_bytes || 0) / 1024)} KB / 500 MB
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ width: `${Math.min(((stats?.storage_used_bytes || 0) / (500 * 1024 * 1024)) * 100 + 1, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
      <div>
        <span className="text-[11px] text-slate-400">{label}</span>
        <p className="text-lg font-bold text-slate-100 mt-0.5">{value || 0}</p>
      </div>
      <Icon size={18} className="text-slate-500" />
    </div>
  );
}
