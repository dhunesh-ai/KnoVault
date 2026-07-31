'use client';

import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Megaphone, Send, Bell, Smartphone, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('app_update');
  const [targetAudience, setTargetAudience] = useState('everyone');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const data = await adminService.getAnnouncements();
      setHistory(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');

    try {
      const res = await adminService.sendAnnouncement({
        title,
        message,
        category,
        target_audience: targetAudience,
      });
      setStatusMsg(res.message || 'Announcement broadcasted successfully!');
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Broadcast failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Announcement & Alert Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Broadcast platform notifications, maintenance alerts, or emergency notices directly to Web and Mobile apps.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Broadcast Form */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Megaphone size={18} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-200">Compose Broadcast Notification</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Announcement Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled System Maintenance Notice"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
              >
                <option value="app_update">App Update</option>
                <option value="maintenance">Scheduled Maintenance</option>
                <option value="feature">New Feature Release</option>
                <option value="emergency">Emergency Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Audience</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'everyone', label: 'Everyone (Web + Mobile)', icon: Bell },
                { id: 'mobile_only', label: 'Mobile App Only', icon: Smartphone },
                { id: 'web_only', label: 'Web Portal Only', icon: Globe },
              ].map((aud) => {
                const Icon = aud.icon;
                const isSelected = targetAudience === aud.id;
                return (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetAudience(aud.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{aud.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message Content</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message text to broadcast to users..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={15} />
                  <span>Broadcast Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Past Announcements Broadcast History</h3>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No announcements sent yet.</p>
          ) : (
            history.map((ann: any) => (
              <div key={ann.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{ann.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Audience: {ann.target_audience}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ann.message}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {new Date(ann.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
