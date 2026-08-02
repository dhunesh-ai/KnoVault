"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePathname, useRouter } from "next/navigation";

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      return;
    }

    if (!isLoading) {
      if (!isAuthenticated && !publicRoutes.includes(pathname)) {
        router.push("/login");
      } else if (isAuthenticated && ["/login", "/register", "/forgot-password"].includes(pathname)) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading && !pathname.startsWith('/admin')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}
