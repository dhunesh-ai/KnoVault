"use client";

import { motion } from "framer-motion";

import { Shield } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="backdrop-blur-xl bg-card border border-border shadow-2xl rounded-3xl p-8"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(124,77,255,0.2)]">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              KnoVault
            </h1>
            <p className="text-primary/80 mt-2 text-sm font-medium">Secure Knowledge & Life Management</p>
          </div>
          <div className="mb-6 text-center">
            <p className="text-muted-foreground text-sm">Your secure digital vault</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
