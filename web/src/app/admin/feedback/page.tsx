'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { MessageSquare, Bug, Lightbulb, CheckCircle2 } from 'lucide-react';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<any>({ bug_reports: [], feature_suggestions: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'bugs' | 'features'>('bugs');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const data = await adminService.getFeedback();
      setFeedback(data || { bug_reports: [], feature_suggestions: [] });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">User Feedback & Support Tickets</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Review user bug reports, app suggestions, and support requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setTab('bugs')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            tab === 'bugs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bug size={15} />
          <span>Bug Reports ({feedback.bug_reports.length})</span>
        </button>
        <button
          onClick={() => setTab('features')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            tab === 'features' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Lightbulb size={15} />
          <span>Feature Requests ({feedback.feature_suggestions.length})</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading support submissions...</div>
        ) : tab === 'bugs' ? (
          feedback.bug_reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
              No bug reports submitted.
            </div>
          ) : (
            feedback.bug_reports.map((b: any) => (
              <div key={b.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">{b.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(b.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">{b.description}</p>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong>Steps:</strong> {b.steps_to_reproduce} &bull; <strong>Device:</strong> {b.device_info} &bull; <strong>Version:</strong> {b.app_version}
                </div>
              </div>
            ))
          )
        ) : (
          feedback.feature_suggestions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
              No feature requests submitted.
            </div>
          ) : (
            feedback.feature_suggestions.map((f: any) => (
              <div key={f.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">{f.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] uppercase font-mono font-semibold border border-purple-200 dark:border-purple-500/30">
                      Priority: {f.priority}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">{f.description}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Expected Benefit: {f.expected_benefit}</p>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
