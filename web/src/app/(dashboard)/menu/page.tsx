"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Shield, 
  Target, 
  Pill, 
  Gift, 
  Settings, 
  LogOut,
  ChevronRight
} from "lucide-react";

export default function MenuPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const menuItems = [
    { name: "Secure Notes", href: "/secure-notes", icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
    { name: "Medicine", href: "/medicine", icon: Pill, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Special Days", href: "/special-days", icon: Gift, color: "text-pink-500", bg: "bg-pink-500/10" },
    { name: "Goals", href: "/goals", icon: Target, color: "text-orange-500", bg: "bg-orange-500/10" },
    { name: "Settings", href: "/settings", icon: Settings, color: "text-gray-500", bg: "bg-gray-500/10" },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="text-xl font-bold text-primary">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{user?.full_name || "User"}</h2>
          <p className="text-sm text-muted-foreground">{user?.email || "Manage your account"}</p>
        </div>
      </div>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-200 active:scale-[0.98]">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="font-medium text-foreground">{item.name}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        ))}

        <div 
          onClick={handleLogout}
          className="flex items-center justify-between p-4 mt-8 bg-destructive/5 rounded-2xl border border-destructive/20 hover:bg-destructive/10 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <span className="font-medium text-destructive">Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
}
