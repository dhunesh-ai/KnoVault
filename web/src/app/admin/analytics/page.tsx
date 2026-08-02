'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { BarChart3, TrendingUp, Users, Cpu } from 'lucide-react';

export default function AnalyticsPage() {
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAnalyticsCharts()
      .then((res) => setCharts(res.chart_data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Platform Growth & Usage Analytics</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Time series tracking for Daily Active Users, Registrations, and AI Requests.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading analytics time series data...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-sm">
              <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>7-Day Platform Activity Metric Summary</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Daily Active Users (DAU)</th>
                    <th className="py-3 px-4">New Registrations</th>
                    <th className="py-3 px-4">AI Engine Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                  {charts.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-bold">{c.date}</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">{c.dau}</td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">+{c.new_users}</td>
                      <td className="py-3 px-4 text-purple-600 dark:text-purple-400 font-semibold">{c.ai_requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
