# KnoVault

KnoVault is a premium, AI-powered productivity app designed to function as your second brain. Built with a modern, glassmorphic UI, it seamlessly integrates note-taking, daily goals, project tasks, and AI chat into a single, cohesive cross-platform experience.

## Features
- **Secure Notes**: Production-grade encryption using `cryptography.fernet` to keep your sensitive notes completely private.
- **Smart Notes**: Support for voice memos, field notes, and checklists within a unified markdown-like editor.
- **AI Second-Brain**: An integrated AI assistant (powered by Groq / LLaMA 3.1) that can summarize your notes, detect intents, and extract important links.
- **Goals & Projects**: Comprehensive hybrid goal system and project task tracking.
- **Global Dynamic Theming**: Real-time accent color switching and dark/light modes.
- **Cross-Platform**: Built with Expo and React Native, targeting both iOS and Android with a highly polished design.

## Tech Stack
- **Frontend**: React Native, Expo, TypeScript, Zustand, Reanimated
- **Backend**: FastAPI (Python), SQLAlchemy, asyncpg
- **Database**: PostgreSQL (Neon Serverless)
- **Authentication**: Firebase Authentication & JWT
- **AI & ML**: Groq API (LLaMA)

## Screenshots
![Home Screen Placeholder](/path/to/screenshot1.png)
![AI Chat Placeholder](/path/to/screenshot2.png)
![Secure Notes Placeholder](/path/to/screenshot3.png)

## Local Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Expo CLI
- PostgreSQL (or Neon DB URL)
- Firebase Admin SDK credentials

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file in the `backend` folder and configure your variables (`DATABASE_URL`, `JWT_SECRET`, `FERNET_SECRET_KEY`, `GROQ_API_KEY`, etc.).
6. Place your `firebase-adminsdk.json` in `backend/secrets/`.
7. Start the FastAPI server: `uvicorn main:app --reload` (or use `START_BACKEND.bat`).

### Mobile Setup
1. Navigate to the mobile directory: `cd mobile`
2. Install dependencies: `npm install`
3. Place your `google-services.json` in the `mobile` root and/or `mobile/android/app/` if running bare workflow.
4. Start the Expo development server: `npx expo start -c` (or use `START_MOBILE.bat`).

## Render Deployment Instructions (Backend)
1. In the Render Dashboard, click **New +** and select **Web Service**.
2. Connect this GitHub repository.
3. Configure the service:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Go to the **Environment Variables** section and manually add all the variables from your local `backend/.env`.
   - **Crucial**: Ensure `FERNET_SECRET_KEY`, `DATABASE_URL`, and `JWT_SECRET` are exactly as they are locally to prevent data loss.
5. For the `backend/secrets/firebase-adminsdk.json` file, Render offers Secret Files. Create a Secret File mapped to the correct path in the backend and paste your Firebase JSON content there.
6. Click **Create Web Service**. Render will automatically build and deploy your FastAPI application.
