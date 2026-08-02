'use client';

import React, { useState } from 'react';
import { adminService } from '@/services/adminService';
import { Database, Download, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [backupRes, setBackupRes] = useState<any>(null);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await adminService.exportBackup();
      setBackupRes(res);
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Database Backup & Disaster Recovery</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Export encrypted database metadata archives and system configuration snapshots.</p>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">System Database Export</h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Generate an instant snapshot backup package of Neon PostgreSQL system tables and metadata records.
        </p>

        <button
          onClick={handleBackup}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Download size={15} />
              <span>Generate Backup Export</span>
            </>
          )}
        </button>

        {backupRes && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} />
              <span>{backupRes.message}</span>
            </div>
            <p className="font-mono text-[11px] text-slate-800 dark:text-slate-300">File: {backupRes.backup_file}</p>
            <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400">Generated: {backupRes.timestamp}</p>
          </div>
        )}
      </div>
    </div>
  );
}
