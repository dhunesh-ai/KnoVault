'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { ShieldCheck, ShieldAlert, Lock, AlertOctagon } from 'lucide-react';

export default function SecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getSecurityLogs()
      .then((res) => setLogs(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Security Center & Intrusion Audit</h1>
        <p className="text-xs text-slate-400 mt-1">Monitor failed logins, suspicious access attempts, and authentication anomalies.</p>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User Email / ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">Loading security logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">No security events logged.</td>
                </tr>
              ) : (
                logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        l.event_type.includes('failed') || l.event_type.includes('denied')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {l.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{l.user_email || `ID #${l.user_id}` || 'Anonymous'}</td>
                    <td className="py-3 px-4 text-indigo-400">{l.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 capitalize text-slate-400">{l.platform || 'web'}</td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{l.details || '-'}</td>
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
