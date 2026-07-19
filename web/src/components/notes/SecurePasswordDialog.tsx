"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye, EyeOff, Loader2, KeyRound, Smartphone, AlertCircle } from "lucide-react";
import { secureNotesService, SecureNotesStatus } from "@/services/secureNotes";
import { toast } from "sonner";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface SecurePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerifySuccess: () => void;
  onCancel: () => void;
}

type DialogStep = "loading" | "set_password" | "unlock" | "forgot_otp" | "reset_password" | "locked";

export function SecurePasswordDialog({ open, onOpenChange, onVerifySuccess, onCancel }: SecurePasswordDialogProps) {
  const [step, setStep] = useState<DialogStep>("loading");
  const [status, setStatus] = useState<SecureNotesStatus | null>(null);
  
  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch status on open
  useEffect(() => {
    if (open) {
      fetchStatus();
    } else {
      // Reset state on close
      setStep("loading");
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            fetchStatus(); // re-verify status once lockout expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockoutTimeLeft]);

  const fetchStatus = async () => {
    setStep("loading");
    try {
      const data = await secureNotesService.getStatus();
      setStatus(data);
      
      if (data.is_locked && data.locked_until) {
        const lockedUntilDate = new Date(data.locked_until);
        const now = new Date();
        const diffSeconds = Math.max(0, Math.floor((lockedUntilDate.getTime() - now.getTime()) / 1000));
        if (diffSeconds > 0) {
          setLockoutTimeLeft(diffSeconds);
          setStep("locked");
          return;
        }
      }

      if (!data.is_password_set) {
        setStep("set_password");
      } else {
        setStep("unlock");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to load secure vault status");
      onCancel();
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await secureNotesService.setPassword(password);
      toast.success("Secure password created successfully");
      onVerifySuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    try {
      await secureNotesService.verifyPassword(password);
      onVerifySuccess();
    } catch (e: any) {
      const detail = e.response?.data?.detail || "";
      toast.error(detail || "Incorrect secure password");
      // Re-fetch status to update failed attempts / lockout state
      fetchStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    try {
      await secureNotesService.sendResetOtp();
      toast.success("Reset OTP sent to your registered email");
      setStep("forgot_otp");
      setOtpCode("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to send reset OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Enter a 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    try {
      await secureNotesService.verifyResetOtp(otpCode);
      toast.success("OTP verified successfully");
      setStep("reset_password");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await secureNotesService.resetPassword(otpCode, password);
      toast.success("Password reset successfully. Please unlock.");
      setStep("unlock");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const stepVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onCancel(); }}>
      <DialogContent className="sm:max-w-[420px] bg-card/70 border border-border/30 backdrop-blur-2xl text-foreground rounded-3xl p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 via-primary to-secondary" />
        
        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div 
              key="loading" 
              variants={stepVariants} 
              initial="hidden" 
              animate="visible" 
              exit="exit"
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground mt-4 font-semibold">Verifying secure vault status...</p>
            </motion.div>
          )}

          {step === "set_password" && (
            <motion.div key="set" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <DialogHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">🔒 Create Secure Password</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  Secure Notes require a separate independent password to encrypt your sensitive vaults.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreatePassword} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">New Secure Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="bg-accent/20 border-border/40 rounded-xl pr-10 text-xs h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Confirm Secure Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat secure password"
                      className="bg-accent/20 border-border/40 rounded-xl pr-10 text-xs h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4 flex-row justify-end">
                  <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs h-10 flex-1 sm:flex-initial shadow-lg shadow-primary/20">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Password
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}

          {step === "unlock" && (
            <motion.div key="unlock" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <DialogHeader>
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-2">
                  <Shield className="w-7 h-7 text-red-500" />
                </div>
                <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                  🔒 KnoVault Security
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-semibold">
                  Secure Note • Enter Secure Password
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleVerifyPassword} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-muted-foreground">Secure Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] text-red-400 hover:text-red-500 font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter secure vault password"
                      className="bg-accent/20 border-border/40 rounded-xl pr-10 text-xs h-10"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4 flex-row justify-end">
                  <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || !password} className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs h-10 flex-1 sm:flex-initial shadow-lg shadow-red-500/20">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Unlock Note
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}

          {step === "locked" && (
            <motion.div key="locked" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Vault Temporarily Locked</h3>
              <p className="text-xs text-muted-foreground font-medium max-w-[280px] mx-auto leading-relaxed">
                Too many failed attempts. For your security, the vault is locked. Please try again in:
              </p>
              <div className="text-3xl font-black text-yellow-500 font-mono tracking-wider pt-2">
                {formatTime(lockoutTimeLeft)}
              </div>
              <Button type="button" variant="outline" onClick={onCancel} className="mt-4 rounded-xl text-xs h-10 w-full max-w-[200px]">
                Close
              </Button>
            </motion.div>
          )}

          {step === "forgot_otp" && (
            <motion.div key="otp" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <DialogHeader>
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-2">
                  <Smartphone className="w-7 h-7 text-red-500" />
                </div>
                <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">🔑 Verify Identity</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  We sent a 6-digit OTP code to your registered email to reset your Secure Notes password.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-muted-foreground">OTP Code</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] text-red-400 hover:text-red-500 font-bold hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <Input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className="bg-accent/20 border-border/40 text-center tracking-[0.25em] font-mono font-bold text-base h-11 rounded-xl"
                    required
                  />
                </div>

                <DialogFooter className="gap-2 pt-4 flex-row justify-end">
                  <Button type="button" variant="ghost" onClick={() => setStep("unlock")} className="rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading || otpCode.length !== 6} className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Verify OTP
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}

          {step === "reset_password" && (
            <motion.div key="reset" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <DialogHeader>
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-2">
                  <KeyRound className="w-7 h-7 text-red-500" />
                </div>
                <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">🔒 Reset Secure Password</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  Enter your new independent Secure Notes Password.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">New Secure Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="bg-accent/20 border-border/40 rounded-xl pr-10 text-xs h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new secure password"
                      className="bg-accent/20 border-border/40 rounded-xl pr-10 text-xs h-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4 flex-row justify-end">
                  <Button type="button" variant="ghost" onClick={() => setStep("unlock")} className="rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs h-10 flex-1 sm:flex-initial">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Reset Password
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
