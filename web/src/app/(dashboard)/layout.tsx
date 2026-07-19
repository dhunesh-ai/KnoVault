"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { NotificationDaemon } from "@/components/reminders/NotificationDaemon";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-x-hidden">
      <NotificationDaemon />
      {/* Premium glowing background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/8 blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute top-[30%] right-[20%] w-[35%] h-[35%] rounded-full bg-purple-400/5 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      <Sidebar />
      
      <div className="flex-1 flex flex-col md:pl-72 min-w-0 transition-all duration-300 pb-20 md:pb-0 relative z-10">
        <div className="p-4 md:p-6 flex-1 flex flex-col min-w-0 gap-6">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-1">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      <MobileNav />
    </div>
  );
}
