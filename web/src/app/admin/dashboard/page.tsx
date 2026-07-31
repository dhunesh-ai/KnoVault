'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  FileText,
  Bell,
  Target,
  FolderKanban,
  Building2,
  Calendar,
  Cpu,
  Zap,
  Activity,
  HardDrive,
  Globe,
  Smartphone,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Fetching real-time platform metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">KnoVault Production Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time platform metrics, user engagement, and system health.</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. USER METRICS SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">User Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Users" value={stats?.users?.total_users} icon={Users} color="indigo" />
          <StatCard title="Active Today" value={stats?.users?.active_today} icon={Activity} color="emerald" />
          <StatCard title="New Users Today" value={stats?.users?.new_today} icon={UserCheck} color="cyan" />
          <StatCard title="Verified Users" value={stats?.users?.verified_users} icon={ShieldCheck} color="blue" />
          <StatCard title="Blocked Users" value={stats?.users?.blocked_users} icon={UserX} color="rose" />
          <StatCard title="Deleted Users" value={stats?.users?.deleted_users} icon={UserMinus} color="amber" />
        </div>
      </div>

      {/* 2. CONTENT METRICS SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-purple-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Platform Content</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Notes" value={stats?.content?.total_notes} icon={FileText} color="violet" />
          <StatCard title="Total Reminders" value={stats?.content?.total_reminders} icon={Bell} color="amber" />
          <StatCard title="Total Goals" value={stats?.content?.total_goals} icon={Target} color="emerald" />
          <StatCard title="Projects" value={stats?.content?.total_projects} icon={FolderKanban} color="sky" />
          <StatCard title="Workspaces" value={stats?.content?.total_workspaces} icon={Building2} color="indigo" />
          <StatCard title="Special Days" value={stats?.content?.total_special_days} icon={Calendar} color="pink" />
        </div>
      </div>

      {/* 3. AI & SYSTEM METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Monitoring Box */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Cpu size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI Intelligence & Token Monitor</h3>
                <p className="text-[11px] text-slate-400">Model: {stats?.ai?.current_model}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Groq Cloud Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Conversations</span>
              <p className="text-lg font-bold text-slate-100 mt-1">{stats?.ai?.total_conversations || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Requests Today</span>
              <p className="text-lg font-bold text-indigo-400 mt-1">{stats?.ai?.total_requests_today || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Avg Response Time</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">{stats?.ai?.average_response_time_ms} ms</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Est. Daily Tokens</span>
              <p className="text-lg font-bold text-purple-400 mt-1">{stats?.ai?.daily_token_usage}</p>
            </div>
          </div>
        </div>

        {/* System Health Box */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">System Infrastructure & Storage</h3>
                <p className="text-[11px] text-slate-400">Neon PostgreSQL DB + Render Backend</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ALL SYSTEMS ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Database Status</span>
              <p className="text-sm font-bold text-emerald-400 mt-1 uppercase">{stats?.system?.database_status}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Est. Storage Used</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{stats?.system?.storage_usage_mb} MB</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400">Mobile Users</span>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{stats?.system?.mobile_users}</p>
              </div>
              <Smartphone className="text-indigo-400" size={20} />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400">Web Users</span>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{stats?.system?.web_users}</p>
              </div>
              <Globe className="text-violet-400" size={20} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">{title}</span>
        <div className={`p-1.5 rounded-lg border ${colorMap[color]}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-xl font-bold text-slate-100 tracking-tight">{value ?? 0}</p>
    </div>
  );
}
