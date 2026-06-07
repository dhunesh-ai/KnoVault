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
  { name: "Secure Notes", href: "/secure-notes", icon: Shield },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Medicine", href: "/medicine", icon: Pill },
  { name: "Special Days", href: "/special-days", icon: Gift },
  { name: "Goals", href: "/goals", icon: Target },
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
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 border-r border-border bg-background/80 backdrop-blur-xl z-30 transition-all duration-300">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(124,77,255,0.5)]">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          KnoVault
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  item.highlight && !isActive && "text-primary hover:text-primary/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 relative z-10 transition-colors",
                    isActive ? "text-primary" : "group-hover:text-foreground",
                    item.highlight && !isActive && "text-primary"
                  )}
                />
                <span className="relative z-10 font-medium text-sm">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                {user?.full_name ? (
                  <span className="text-xs font-bold text-foreground">{user.full_name.charAt(0).toUpperCase()}</span>
                ) : (
                  <Settings className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {user?.full_name || "Settings"}
                </p>
                <p className="text-xs truncate text-muted-foreground">
                  {user?.email || "Manage account"}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mb-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="w-4 h-4 mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
