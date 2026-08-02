'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Cpu, Zap, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export default function AIStatsPage() {
  const [aiStats, setAiStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAIStats();
      setAiStats(data);
    } catch (err: any) {
      console.error(err);
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
          <span className="text-xs font-medium">Fetching AI Engine Performance Stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">AI Intelligence & Token Monitoring</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Monitor Groq AI model performance, latency, token consumption, and feature distribution.
          </p>
        </div>
        <button onClick={fetchStats} className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh AI Stats</span>
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Total AI Conversations</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{aiStats?.total_conversations || 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Estimated Tokens Today</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{aiStats?.total_tokens_today || 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Avg Response Time</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{aiStats?.avg_response_time_ms} ms</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Active Model</span>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono">{aiStats?.current_model}</p>
        </div>
      </div>

      {/* Feature Usage Breakdown */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">AI Feature Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(aiStats?.features_breakdown || {}).map(([key, val]: any) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                <span>{key.replace('_', ' ')}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{val} Requests</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                  style={{ width: `${Math.min((val / (aiStats?.total_conversations || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
