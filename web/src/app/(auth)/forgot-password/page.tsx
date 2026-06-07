/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [emailData, setEmailData] = useState<string | null>(null);
  const router = useRouter();

  const { register: registerEmail, handleSubmit: handleSubmitEmail, formState: { errors: emailErrors } } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  const { register: registerReset, handleSubmit: handleSubmitReset, formState: { errors: resetErrors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: data.email });
      setEmailData(data.email);
      setStep("reset");
      toast.success("Password reset code sent to your email!");
    } catch (error: any  ) {
      if (error.response?.status === 404) {
        toast.error("No account found with this email address.");
      } else {
        toast.error("Failed to send reset code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormValues) => {
    if (!emailData) return;
    setIsLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        email: emailData,
        code: data.code,
        new_password: data.new_password,
      });
      setStep("success");
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (error: any  ) {
      toast.error(error.response?.data?.detail || "Failed to reset password. Invalid code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {step === "email" && "Reset Password"}
          {step === "reset" && "Create New Password"}
          {step === "success" && "Password Reset"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {step === "email" && "Enter your email to receive a secure reset code."}
          {step === "reset" && `We sent a 6-digit code to ${emailData}`}
          {step === "success" && "You can now sign in with your new password."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="name@example.com" className="pl-10 h-11 bg-background/50 border-border" disabled={isLoading} {...registerEmail("email")} />
                </div>
                {emailErrors.email && <p className="text-sm text-red-500 font-medium">{emailErrors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-foreground font-semibold shadow-sm mt-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Send Reset Code"}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "reset" && (
          <motion.div key="reset" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <form onSubmit={handleSubmitReset(onResetSubmit)} className="space-y-4">
              <div className="space-y-2 text-center">
                <Label htmlFor="code" className="text-foreground font-medium">Verification Code</Label>
                <Input id="code" placeholder="123456" maxLength={6} className="h-14 text-2xl tracking-[0.5em] text-center font-bold bg-background/50 border-border" disabled={isLoading} {...registerReset("code")} />
                {resetErrors.code && <p className="text-sm text-red-500 font-medium">{resetErrors.code.message}</p>}
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="new_password" className="text-foreground font-medium">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="new_password" type="password" placeholder="Min. 8 characters" className="pl-10 h-11 bg-background/50 border-border" disabled={isLoading} {...registerReset("new_password")} />
                </div>
                {resetErrors.new_password && <p className="text-sm text-red-500 font-medium">{resetErrors.new_password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-foreground font-semibold mt-6 shadow-[0_0_20px_rgba(124,77,255,0.3)]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Reset Password"}
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Wrong email? Go back
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Password Reset Successful</h3>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step === "email" && (
        <div className="text-center text-sm text-muted-foreground pt-4">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-semibold">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
