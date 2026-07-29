"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, StickyNote, Users, MoreHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "AI", href: "/ai", icon: Sparkles, highlight: true },
  { name: "Workspaces", href: "/workspaces", icon: Users },
  { name: "More", href: "/menu", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 h-16 bg-card/75 backdrop-blur-2xl border border-border/30 z-30 flex items-center justify-around px-2 rounded-3xl shadow-[0_8px_32px_rgba(124,77,255,0.06)]">
      {mobileNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
        
        return (
          <Link key={item.name} href={item.href} className="flex-1">
            <div className="flex flex-col items-center justify-center h-full space-y-0.5 cursor-pointer">
              <div
                className={cn(
                  "p-1.5 px-3.5 rounded-2xl transition-all duration-200",
                  isActive ? "bg-primary/10 text-primary font-bold shadow-[0_2px_10px_rgba(124,77,255,0.05)]" : "text-muted-foreground hover:text-foreground",
                  item.highlight && !isActive && "text-primary/80"
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[9px] tracking-wide font-semibold transition-colors",
                  isActive ? "text-primary font-bold" : "text-muted-foreground",
                  item.highlight && !isActive && "text-primary/80"
                )}
              >
                {item.name}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
