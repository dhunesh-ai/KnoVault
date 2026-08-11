"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";

export default function SplashPage() {
  const router = useRouter();

  const handleFinish = () => {
    console.log("[WebSplash] Splash sequence completed!");
    router.push("/");
  };

  return <AnimatedSplashScreen onFinish={handleFinish} autoPlay={true} />;
}
