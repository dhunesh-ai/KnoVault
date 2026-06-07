"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2, Lock } from "lucide-react";
import { useSecureNotesStore } from "@/store/useSecureNotesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "framer-motion";

export function PasswordVerification() {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const unlockSession = useSecureNotesStore((state) => state.unlockSession);
  const error = useSecureNotesStore((state) => state.error);
  const user = useAuthStore((state) => state.user);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !user?.email) return;
    
    setIsVerifying(true);
    const success = await unlockSession(password, user.email);
    setIsVerifying(false);
    
    if (!success) {
      setPassword(""); // Clear input on failure for better UX
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card backdrop-blur-xl border border-border p-8 rounded-2xl text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-primary to-blue-500" />
        
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Shield className="w-8 h-8 text-red-400" />
          <Lock className="w-4 h-4 text-red-200 absolute bottom-3 right-3 bg-red-500 rounded-full p-0.5" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Secure Vault Locked</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Enter your account password to unlock your secure notes session.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            type="password"
            placeholder="Account Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-background/50 border-border text-center text-lg tracking-widest focus-visible:ring-red-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-foreground transition-colors"
            disabled={isVerifying || !password}
          >
            {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Unlock Vault
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
