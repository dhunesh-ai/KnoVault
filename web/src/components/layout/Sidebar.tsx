"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  StickyNote,
  Shield,
  Bell,
  Pill,
  Gift,
  Target,
  Users,
  Sparkles,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Medicine", href: "/medicine", icon: Pill },
  { name: "Special Days", href: "/special-days", icon: Gift },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Workspaces", href: "/workspaces", icon: Users },
  { name: "KnoVault AI", href: "/ai", icon: Sparkles, highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-2rem)] fixed top-4 left-4 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-2xl z-30 shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-4 transition-all duration-300">
      <Link href="/" className="p-4 flex items-center space-x-3 mb-4 group cursor-pointer hover:opacity-90 transition-all duration-200" title="KnoVault Home Dashboard">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_4px_20px_rgba(124,77,255,0.35)] relative overflow-hidden group-hover:scale-105 transition-transform duration-200">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Shield className="w-5 h-5 text-primary-foreground relative z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight group-hover:text-primary transition-colors">
            KnoVault
          </span>
          <span className="text-[10px] font-semibold text-primary/70 tracking-widest uppercase">
            SECURE V2
          </span>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto py-2 px-1 space-y-1.5 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  item.highlight && !isActive && "text-primary hover:text-primary/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/8 rounded-2xl border border-primary/10 shadow-[0_4px_12px_rgba(124,77,255,0.04)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 relative z-10 transition-colors duration-250",
                    isActive ? "text-primary" : "group-hover:text-foreground",
                    item.highlight && !isActive && "text-primary"
                  )}
                />
                <span className="relative z-10 text-sm tracking-wide">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-2 border-t border-border/40 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors group cursor-pointer border border-transparent hover:border-border/30">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden border border-border/60 group-hover:border-primary/40 transition-colors">
                {user?.full_name ? (
                  <span className="text-sm font-bold text-primary">{user.full_name.charAt(0).toUpperCase()}</span>
                ) : (
                  <Settings className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">
                  {user?.full_name || "Settings"}
                </p>
                <p className="text-[10px] truncate text-muted-foreground font-medium">
                  {user?.email || "Manage account"}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mb-2 rounded-2xl p-1.5 border-border/50 bg-card/90 backdrop-blur-xl">
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-xl cursor-pointer py-2 text-sm">
              <User className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-xl cursor-pointer py-2 text-sm">
              <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer py-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
