# Render Deployment Guide

Follow these steps to deploy your KnoVault FastAPI backend to Render.

## 1. Create a Web Service
1. Log in to your Render dashboard (https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository: `https://github.com/dhunesh-ai/KnoVault`
4. Render will automatically read the `render.yaml` file in your root directory and configure the environment, build command, and start command for you! Simply accept the defaults.

## 2. Configure Environment Variables
In the Render dashboard for your new Web Service, go to the **Environment** tab. Add the following variables (DO NOT commit these to GitHub!):

| Key | Value (from your local `backend/.env`) |
|-----|--------------------------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` (Ensure this exactly matches your Neon URL) |
| `JWT_SECRET` | `super_secret_key_change_in_production` |
| `GROQ_API_KEY` | `gsk_...` |
| `GROQ_MODEL` | `gpt-oss-20b` |
| `FERNET_SECRET_KEY`| `-4n4R...` (CRITICAL: Do not lose this key or you lose access to secure notes!) |
| `SMTP_USER` | `thinkgood24hrs@gmail.com` |
| `SMTP_PASSWORD`| `kyws...` |

## 3. Configure Firebase Credentials Safely
Instead of uploading your `firebase-adminsdk.json` file directly (which is a security risk), KnoVault supports reading credentials directly from an environment variable!
1. Open your `backend/secrets/firebase-adminsdk.json` file locally.
2. Minify/compress the entire JSON object into a single line (you can use a tool like https://www.cleancss.com/json-minify/).
3. In Render, add a new environment variable:
   - **Key**: `FIREBASE_CREDENTIALS_JSON`
   - **Value**: The single-line JSON string you just created.

## 4. Deploy and Verify
1. Click **Deploy**. Render will install Python 3.10.12 and all requirements, then start your FastAPI server.
2. Once deployed, copy your Render URL (e.g. `https://knovault-api.onrender.com`).
3. Verify it is working by visiting `https://knovault-api.onrender.com/health` in your browser. You should see `{"status": "healthy"}`.

## 5. Update Mobile App
When you build the React Native app for production, it will automatically connect to `https://knovault-api.onrender.com`. 

If your actual Render URL turns out to be different (e.g. `https://knovault-api-abc.onrender.com`), make sure to update `mobile/src/config/env.ts` with your specific URL before building the APK/AAB!
