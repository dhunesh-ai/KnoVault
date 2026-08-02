'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { FileText, Shield, User } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAuditLogs()
      .then((res) => setLogs(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin System Audit Logs</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Immutable audit history recording every action performed by platform administrators.</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">Loading admin audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">No admin actions recorded yet.</td>
                </tr>
              ) : (
                logs.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">{a.admin_name} ({a.admin_email})</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] uppercase font-bold border border-indigo-200 dark:border-indigo-500/30">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-purple-600 dark:text-purple-400 font-semibold">{a.target_type}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">#{a.target_id || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{a.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{a.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
