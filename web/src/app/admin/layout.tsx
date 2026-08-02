'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminService } from '@/services/adminService';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Megaphone,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  FileText,
  Settings,
  Database,
  LogOut,
  ShieldAlert,
  Sun,
  Moon,
  UserCheck
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('knovault_admin_theme') : null;
    const initialDark = savedTheme === 'dark';
    setIsDarkMode(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (pathname === '/admin/login') return;

    const user = adminService.getStoredAdminUser();
    if (!user) {
      router.push('/admin/login');
    } else {
      setAdminUser(user);
    }
  }, [pathname, router]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('knovault_admin_theme', nextDark ? 'dark' : 'light');
    }
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-700 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">Loading KnoVault Enterprise Admin Portal...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Storage Management', href: '/admin/storage', icon: Database },
    { label: 'AI Monitoring', href: '/admin/ai', icon: Cpu },
    { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { label: 'Feedback & Support', href: '/admin/feedback', icon: MessageSquare },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Security Center', href: '/admin/security', icon: ShieldCheck },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    { label: 'System Settings', href: '/admin/settings', icon: Settings },
    { label: 'Database Backup', href: '/admin/backup', icon: Database },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex transition-colors duration-200`}>
      {/* Glassmorphic Sidebar */}
      <aside className={`w-64 border-r ${isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-white/80'} backdrop-blur-xl flex flex-col fixed inset-y-0 z-30`}>
        {/* Brand */}
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            K
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              KnoVault Admin
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Enterprise Portal</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin User Card */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800/60 bg-slate-900/40' : 'border-slate-200 bg-slate-100/50'} flex items-center justify-between`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              {adminUser?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold truncate">{adminUser?.full_name || 'Admin User'}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono uppercase">
                {adminUser?.role || 'Super Admin'}
              </span>
            </div>
          </div>
          <button
            onClick={() => adminService.logout()}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
            title="Logout Admin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className={`h-16 border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-white/60'} backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8`}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-indigo-400" />
            <span className="text-xs font-medium text-slate-400">
              KnoVault Admin System v1.0 &bull; Restricted Enterprise Access
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Privacy Badge */}
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Rule #17 Privacy Shield Enforced
            </span>

            {/* Dark/Light Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
