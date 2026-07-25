# 🧪 KnoVault Professional Testing & GitHub Actions CI/CD Guide

This guide documents the complete testing architecture, security review process, local execution procedures, and GitHub Actions CI/CD pipeline built for **KnoVault**.

---

## 🏛️ 1. Architecture Overview

KnoVault's testing system is organized into decoupled layers to ensure maximum reliability and speed across backend, web, mobile, and security domains:

```
                          PUSH / PR
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
        ▼                     ▼                      ▼
 ⚙️ Backend Tests        🔒 Security            🌐 Web Unit &
  (pytest + async)         Review             Component Tests
        │                (Semgrep, Audit)            │
        │                                            │
        ▼                                            ▼
 📊 Backend Report                             🔨 Build Web App
                                                     │
                                                     ▼
                                              🧪 Web E2E Tests
                                                     │
                      ┌──────────────────────────────┘
                      │
                      ▼
               📱 Build Android APK
                      │
                      ▼
               🧪 Appium Mobile E2E
                      │
                      ▼
            🔍 Live Deployment Check
                      │
                      ▼
            📊 Unified Test Summary
```

---

## ⚙️ 2. Backend Automated Testing (`backend/tests/`)

- **Framework**: `pytest` + `pytest-asyncio` + `httpx.AsyncClient`
- **Database Isolation**: Tests execute against an isolated in-memory SQLite database (`sqlite+aiosqlite:///:memory:`). Production databases and production data are never touched.
- **AI Service Boundary**: External AI API calls (Groq API) are mocked at the boundary level to ensure fast, zero-cost, offline-friendly test runs.
- **Coverage Areas**:
  - **Auth**: Signup init, OTP generation & verification, password hashing, login, invalid credentials (401), protected route security.
  - **Notes**: Create, retrieve, update, delete, search filters, 404 validation.
  - **Reminders**: Create custom & medicine reminders, upcoming reminders, completion toggle.
  - **Calendar**: Calendar event aggregation & calendar notes.
  - **Special Days & Birthdays**: CRUD operations & scheduled wish email triggers.
  - **Goals & Habits**: Goal creation, progress updates, completion.
  - **Projects**: Task creation, status transition, deletion.
  - **Medicine**: Dose creation, schedule tracking, medicine reminder metadata.
  - **Workspaces**: Workspace creation, member listing, role permissions.
  - **Storage & Sync**: Storage metrics, sync trigger endpoints.
  - **Error Handling**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity.

---

## 🌐 3. Web Frontend Unit & Component Tests (`web/src/__tests__/`)

- **Framework**: Vitest + React Testing Library + `@testing-library/jest-dom` + JSDOM
- **Coverage Areas**:
  - `dashboard.test.tsx`: Greeting, stats counters, quick actions.
  - `notes.test.tsx`: Notes list, search filter, note card rendering.
  - `reminders.test.tsx`: Reminders list, priority filter, completion check.
  - `medicine.test.tsx`: Dose schedule, pill intake action button.
  - `special_days.test.tsx`: Special days list, email wish scheduler modal trigger.
  - `goals.test.tsx`: Goal progress bar, completion percentage.
  - `projects.test.tsx`: Project boards, status badges, task completion.
  - `workspaces.test.tsx`: Workspace list, member invite modal trigger.
  - `ai_chat.test.tsx`: KnoVault AI chat form, prompt submission.
  - `profile_settings.test.tsx`: User profile details, theme switcher, About KnoVault.

---

## 🧪 4. Web E2E Testing (`e2e_tests/selenium_web/`)

- **Framework**: Selenium WebDriver (Headless Chrome) & Playwright compatible
- **Features**: Real user journey testing across auth, dashboard, notes, reminders, goals, medicine, special days, workspaces, AI, and profile. Generates formatted Excel execution reports in `e2e_tests/reports/`.

---

## 📱 5. Mobile / Android Testing (`e2e_tests/appium_mobile/`)

- **APK Compilation**: Compiles debug APK via `./gradlew assembleDebug` in `mobile/android`.
- **Appium E2E**: Tests mobile screen flows using Appium 2.5 + UiAutomator2 targeting KnoVault accessibility labels and test IDs.

---

## 🔒 6. Security Review Pipeline

- **SAST (Static Code Analysis)**: Semgrep scanning for OWASP Top 10, JavaScript/Python security risks, and secrets.
- **Dependency Audit**: `npm audit` checking active production packages.
- **Filesystem Scan**: Trivy filesystem scan producing SARIF vulnerability reports.
- **Secret Detection**: Gitleaks scanner verifying zero hardcoded credentials or API keys.

---

## 📊 7. Unified Summary & Reports

- Final pipeline job downloads test outputs from all preceding jobs.
- Executes `.github/scripts/generate-unified-summary.cjs` to build a GitHub Step Summary dashboard (`$GITHUB_STEP_SUMMARY`) and an interactive HTML report dashboard published to `gh-pages`.

---

## 🔑 8. Required GitHub Secrets

To configure in **GitHub Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Purpose / Description | Required? |
|---|---|---|
| `GROQ_API_KEY` | Optional Groq AI key for staging verification | Optional (Mocked in CI) |
| `SECRET_KEY` | JWT Signing secret string | Recommended |
| `LIVE_WEB_URL` | Live web application URL for deployment verification | Optional |
| `SEMGREP_APP_TOKEN` | Token for Semgrep SAST dashboard reporting | Optional |

---

## 🛠️ 9. Local Execution Commands

### Run Backend Tests
```bash
cd backend
python -m pytest tests/ -v --junitxml=test-results.xml
```

### Run Web Component Tests
```bash
cd web
npm test
```

### Run Web & Mobile E2E Tests
```bash
cd e2e_tests
npm run test:web      # Run Web E2E
npm run test:mobile   # Run Mobile E2E
node run-tests.js --all # Run complete E2E orchestrator
```

### Run Security & Unified Summary Generators
```bash
node .github/scripts/generate-security-reports.cjs
node .github/scripts/generate-unified-summary.cjs
```

---

## 🔍 10. Diagnosing CI Job Failures

1. Navigate to **Actions** tab in GitHub repository.
2. Select the specific workflow run.
3. Review the **Job Summary** section at the top of the page for high-level pass/fail statistics.
4. Click into the specific failed job (e.g., `⚙️ Backend API Tests` or `🌐 Web Unit Tests`) to inspect exact terminal output and stack trace.
