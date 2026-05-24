# KnoVault Developer Workflow & Startup Automation

Welcome to the KnoVault full-stack development workflow! This guide will help you run the React Native Expo app, FastAPI backend, Neon PostgreSQL database, and Firebase integration smoothly.

We have provided 3 automated batch scripts at the root of the project to remove the friction from your daily workflow.

---

## 🚀 1. How to Run KnoVault (The Quick Way)

You no longer need to open multiple terminals and manually run commands. Simply use the provided batch scripts:

1. Connect your physical Android phone via USB.
2. Ensure your phone is unlocked.
3. Double-click **`START_APP.bat`** located in the root of the KnoVault folder.

### What `START_APP.bat` does automatically:
1. Opens a new terminal window for the **Backend**.
2. Activates the Python virtual environment and installs missing requirements.
3. Starts the FastAPI server (`uvicorn`) and tests the backend health.
4. Opens a second terminal window for the **Mobile App**.
5. Kills the Gradle daemon (to prevent stuck builds), clears old ADB authorizations to fix connection bugs, and restarts the ADB server.
6. **Waits for you to tap "Allow USB debugging" on your phone.**
7. Forces Expo to use your local ADB and launches the app directly on your device via `npx expo run:android`.

> **TIP:** If you only want to work on one part of the stack, you can individually run **`START_BACKEND.bat`** or **`START_MOBILE.bat`**.

---

## 🛠️ 2. Recommended Daily Workflow

For the best developer experience, follow this workflow:

1. **Boot Sequence**: Always use `START_APP.bat` to boot up. Wait for the backend to say `[OK] Backend is healthy` before focusing on the mobile terminal.
2. **Device Connection**: When the mobile terminal says `PLEASE LOOK AT YOUR PHONE SCREEN NOW!`, check your phone and allow USB debugging immediately.
3. **Hot Reloading**: Once Expo installs the app on your phone, you can leave both terminal windows running in the background. Editing files in `mobile/src` or `backend/` will automatically trigger hot-reloading.
4. **Closing Down**: When you are done for the day, close the `KnoVault Backend` and `KnoVault Mobile` windows to cleanly shut down the servers.

---

## ✅ 3. Verification Checklist

After launching the app, verify that all services are communicating correctly:

- [ ] **Backend Health**: Visit `http://localhost:8000/docs` in your browser. You should see the FastAPI Swagger UI.
- [ ] **Database Connection**: Try signing up or logging into the app. If it works, Neon PostgreSQL is connected successfully.
- [ ] **Firebase Google Sign-In**: Tap the Google Sign-In button on the login screen. It should bring up the Google account picker without crashing.
- [ ] **Expo Dev Client**: Shake your phone or press `m` in the mobile terminal to open the Expo Developer Menu.
- [ ] **FCM Notifications**: When the app is in the background, verify you can receive push notifications.

---

## 🚨 4. Troubleshooting Guide

### Issue: ADB Unauthorized / Device Not Found
**Symptom:** Expo says `No Android connected device found` or `CommandError: Could not find device`.
**Fix:**
1. Open your phone's Settings → Developer Options.
2. Tap **Revoke USB debugging authorizations**.
3. Unplug your phone and run `START_MOBILE.bat`.
4. Re-plug your phone and wait for the prompt. Check "Always allow" and tap OK.

### Issue: Metro Bundler Port 8081 is in use
**Symptom:** Expo fails to start because port 8081 is occupied.
**Fix:**
Press `Ctrl+C` in the mobile terminal. Then run `npx expo start --clear` inside the `mobile` folder to reset the Metro cache and force it to find an available port.

### Issue: Backend Health Check Fails
**Symptom:** `START_APP.bat` says `[!] Backend might not be fully ready yet`.
**Fix:**
Check the "KnoVault Backend" terminal window. It likely crashed because of missing environment variables in `backend/.env` (e.g., incorrect Neon DB URL or Firebase credentials). Fix the `.env` file and restart the backend.

### Issue: Android Build Failures (Gradle Error)
**Symptom:** `npx expo run:android` throws Java/Gradle exceptions.
**Fix:**
1. Close the mobile terminal.
2. Run this inside the `mobile` folder to clean the build cache:
   ```cmd
   cd android && gradlew.bat clean && cd ..
   ```
3. Run `START_MOBILE.bat` again.

### Issue: Google Sign-In Fails (Developer Error)
**Symptom:** Tapping Google Sign-in returns a `DEVELOPER_ERROR` or silently fails.
**Fix:**
Ensure your `env.ts` contains the correct **Web Client ID** (not Android Client ID) and that you have added your debug SHA-1 key to your Firebase Console settings.
