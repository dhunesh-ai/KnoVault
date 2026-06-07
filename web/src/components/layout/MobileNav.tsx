"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, StickyNote, Bell, MoreHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "AI", href: "/ai", icon: Sparkles, highlight: true },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "More", href: "/menu", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-background/90 backdrop-blur-xl border-t border-border z-30 flex items-center justify-around px-2 pb-safe">
      {mobileNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
        
        return (
          <Link key={item.name} href={item.href} className="flex-1">
            <div className="flex flex-col items-center justify-center h-full space-y-1">
              <div
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isActive ? "bg-primary/20 text-primary" : "text-muted-foreground",
                  item.highlight && !isActive && "text-primary/70"
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                  item.highlight && !isActive && "text-primary/70"
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
