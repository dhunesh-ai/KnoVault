/**
 * KnoVault Web App Centralized Environment & Feature Configuration
 */

export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "https://knovault-jbph.onrender.com",
  AI_CHAT_ENABLED: process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "true",
} as const;

if (typeof window !== "undefined") {
  console.log('[FEATURE FLAG] Web AI_CHAT_ENABLED:', env.AI_CHAT_ENABLED);
}

export type WebEnv = typeof env;

