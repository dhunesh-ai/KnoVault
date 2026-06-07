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
import { Loader2, CheckCircle2, ArrowRight, Mail, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

const emailSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

const otpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits"),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function RegisterPage() {
  const [step, setStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailData, setEmailData] = useState<EmailFormValues | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  
  const router = useRouter();
  const { login, loginWithGoogle } = useAuthStore();

  const { register: registerEmail, handleSubmit: handleSubmitEmail, formState: { errors: emailErrors } } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  const { register: registerOtp, handleSubmit: handleSubmitOtp, formState: { errors: otpErrors } } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors } } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/send-signup-otp", {
        email: data.email,
        full_name: data.full_name,
      });
      setEmailData(data);
      setStep("otp");
      toast.success("Verification code sent to your email!");
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (error.response?.status === 429) {
        toast.error("Please wait a moment before requesting another code.");
      } else {
        toast.error(error.response?.data?.detail || "Failed to send OTP.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
    if (!emailData) return;
    setIsLoading(true);
    try {
      // Just verifying the OTP here before asking for password
      await api.post("/api/auth/verify-otp", {
        email: emailData.email,
        code: data.code,
      });
      setOtpCode(data.code);
      setStep("password");
      toast.success("Email verified!");
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      toast.error(error.response?.data?.detail || "Invalid code.");
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!emailData || !otpCode) return;
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/complete-signup", {
        email: emailData.email,
        code: otpCode,
        password: data.password,
      });
      const { access_token, refresh_token, user } = response.data;
      login(access_token, refresh_token, user);
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      toast.error(error.response?.data?.detail || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Successfully signed in with Google!");
      router.push("/dashboard");
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      toast.error(error.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {step === "email" && "Create Account"}
          {step === "otp" && "Check Your Email"}
          {step === "password" && "Secure Your Vault"}
          {step === "success" && "Welcome Aboard!"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {step === "email" && "Start your journey with KnoVault today."}
          {step === "otp" && `We sent a 6-digit code to ${emailData?.email}`}
          {step === "password" && "Create a strong password for your account"}
          {step === "success" && "Redirecting to your dashboard..."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="space-y-4 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-background hover:bg-muted text-foreground border-border flex items-center justify-center gap-2 shadow-sm transition-all"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
              </div>
            </div>

            <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-foreground font-medium">Full Name</Label>
                <Input id="full_name" placeholder="John Doe" className="h-11 bg-background/50 border-border" disabled={isLoading} {...registerEmail("full_name")} />
                {emailErrors.full_name && <p className="text-sm text-red-500 font-medium">{emailErrors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="name@example.com" className="pl-10 h-11 bg-background/50 border-border" disabled={isLoading} {...registerEmail("email")} />
                </div>
                {emailErrors.email && <p className="text-sm text-red-500 font-medium">{emailErrors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-foreground font-semibold shadow-[0_0_20px_rgba(124,77,255,0.3)] mt-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? "Sending Code..." : "Continue"}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <form onSubmit={handleSubmitOtp(onOtpSubmit)} className="space-y-4 mt-6">
              <div className="space-y-2 text-center">
                <Label htmlFor="code" className="text-foreground font-medium">Verification Code</Label>
                <Input id="code" placeholder="123456" maxLength={6} className="h-14 text-2xl tracking-[0.5em] text-center font-bold bg-background/50 border-border" disabled={isLoading} {...registerOtp("code")} />
                {otpErrors.code && <p className="text-sm text-red-500 font-medium">{otpErrors.code.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-foreground font-semibold mt-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify Code"}
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Wrong email? Go back
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "password" && (
          <motion.div key="password" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Create Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Min. 8 characters" className="pl-10 h-11 bg-background/50 border-border" disabled={isLoading} {...registerPassword("password")} />
                </div>
                {passwordErrors.password && <p className="text-sm text-red-500 font-medium">{passwordErrors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-foreground font-semibold mt-6 shadow-[0_0_20px_rgba(124,77,255,0.3)]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Registration Complete</h3>
          </motion.div>
        )}
      </AnimatePresence>

      {step === "email" && (
        <div className="text-center text-sm text-muted-foreground pt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-semibold">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
