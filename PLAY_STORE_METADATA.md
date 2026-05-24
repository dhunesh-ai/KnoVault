# KnoVault - Google Play Store Metadata

This document contains all the necessary text and assets to successfully publish KnoVault to the Google Play Store.

## 1. Store Listing Details

### App Name
KnoVault - AI Second Brain

### Short Description (max 80 characters)
Your AI-powered second brain. Secure notes, goals, calendar, and AI assistant.

### Full Description (max 4000 characters)
KnoVault is not just a note-taking app—it is your AI-powered second brain designed to supercharge your productivity, organization, and focus. 

Built with premium glassmorphism aesthetics and advanced cross-platform syncing, KnoVault safely stores your most critical thoughts, tracks your daily goals, manages your calendar, and provides an intelligent AI assistant that actually understands your notes context.

**Key Features:**
• **AI Assistant (KnoVault AI)**: Chat natively with your notes! The built-in AI assistant dynamically retrieves context from your secure notes and helps you summarize, generate ideas, and remember details effortlessly.
• **Military-Grade Secure Notes**: Not all thoughts are public. Lock your private notes behind local device authentication and robust Fernet encryption. Even our database cannot read your secure notes!
• **Intelligent Goal Tracking**: Break down your life into master goals, daily tasks, and atomic habits. Visualize your progress with beautiful, animated progress rings.
• **Unified Calendar & Reminders**: Never miss an important day. Sync birthdays, anniversaries, special events, and custom reminders directly to your home screen with push notifications.
• **Cloud Synchronization**: Your data securely syncs across the cloud in real-time. Start a note on your phone and access it instantly via the live backend.
• **Voice-to-Text**: Capture ideas on the go with high-accuracy voice-to-text integration. 

Take back control of your mind. Download KnoVault and build your second brain today!

### Keywords / Tags (for search optimization)
Productivity, AI Assistant, Note Taking, Secure Notes, Goal Tracker, Second Brain, Habit Tracker, Planner, Voice Notes, Organizer.

### Category
Productivity

---

## 2. Privacy Policy Draft

> **Note to Developer**: You MUST host this privacy policy on a publicly accessible URL (like a GitHub Pages site or Notion page) and link it in the Google Play Console under **App Content -> Privacy Policy**.

**Privacy Policy for KnoVault**

**1. Introduction**
Welcome to KnoVault. We are committed to protecting your privacy. This policy explains how we handle your data when you use our mobile application and services.

**2. Data Collection**
- **Account Information**: When you register or use Google Sign-In, we collect your email address and basic profile information to authenticate you securely.
- **User Content**: We store the notes, goals, and calendar events you create to sync them across your devices.
- **Secure Notes**: Any note marked as "Secure" is encrypted using industry-standard Fernet encryption before leaving your device. We do not have the decryption keys and cannot read your secure notes.

**3. Third-Party Services**
We use the following third-party services:
- **Firebase Authentication**: For secure login and account management.
- **Render & Neon PostgreSQL**: For secure cloud hosting and database management.
- **Groq API**: For processing AI chat requests. The AI only processes the specific notes required to answer your query.

**4. Data Security**
We implement strict security measures, including AES encryption and HTTPS transport, to prevent unauthorized access to your data.

**5. Your Rights**
You have the right to request deletion of your account and all associated data at any time by contacting our support team or using the in-app account deletion feature.

**6. Contact Us**
If you have questions about this privacy policy, please contact us at: [Your Support Email].

---

## 3. Google Play Console Checklist

Before pressing "Rollout to Production", ensure you have completed the following in the Google Play Console:

- [ ] **App Content Declarations**:
  - Filled out the **Data Safety Form** (Declare that you collect Email, Name, and App Data, but emphasize that Secure Notes are End-to-End Encrypted/Server-Side Encrypted).
  - Filled out the **Target Audience and Content** (Set to 13+ or 18+ depending on preference, not directed at children).
  - Filled out the **News App** (Select No).
  - Filled out the **COVID-19 app** (Select No).
  - Provided the URL to your **Privacy Policy**.
- [ ] **Store Presence**:
  - Uploaded your App Icon (512x512).
  - Uploaded your Feature Graphic (1024x500).
  - Uploaded at least 3-4 Mobile Screenshots.
- [ ] **Testing Tracks**:
  - Upload your `.aab` file to **Internal Testing** first to verify on your own devices.
  - (Optional but recommended) Promote to **Closed Testing** for 14 days if required by new Google Play account rules.
- [ ] **Production**:
  - Promote your release to Production!
