# Sustainability360 — ESG · LCA · MRV platform (clone)

A full copy of the Sustainability360 web app:

- **frontend/**: the original React source, recovered unchanged from the live preview (every page, component and style), plus build config.
- **backend/**: a new FastAPI backend that implements every API endpoint the frontend calls. It saves data in a local SQLite file, so no database server is needed.

## Modules
Dashboard (KPIs, charts, map) · Users & join requests · LCA studies (ISO 14040/44, auto-calculated footprint, PDF/Word/Excel export) · ESG reports (GRI/SASB/BRSR/CSRD + SASB metrics) · Traceability (farms, field records, batches, QR codes, public trace page, audit PDF) · Carbon projects (PDD PDF, Excel) · Geo/Map (Leaflet + polygon drawing) · AI Drafter · Flagship report (public `/r/<slug>` page + PDF) · Audit trail · Plans & billing · Region & formats

## Requirements
- Python 3.10+
- Node.js 18+ (LTS)

## Run it (Windows)
1. Double-click **`start-backend.bat`**. The first run installs Python packages and starts the API at http://localhost:8001.
2. Double-click **`start-frontend.bat`**. The first run installs npm packages (takes a few minutes), then opens http://localhost:3000.
3. Sign in with the auto-created super admin: **admin@sustainability360.local / admin123**, or click *Register* to create your own company workspace.

## Run it (manual / macOS / Linux)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit secrets
uvicorn server:app --reload --port 8001

cd ../frontend
npm install
npm start                      # http://localhost:3000
```

## Configuration (`backend/.env`)
| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Sign-in token secret. **Change it** before deploying. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First super-admin account. |
| `FRONTEND_URL` | Used in QR codes and password-reset links. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | Optional. Turns on real AI drafting. Without them, the AI Drafter and Flagship Report use a structured offline template. |
| `STRIPE_API_KEY` | Optional. Turns on real Stripe checkout. Without it, paid plans activate instantly in demo mode. |

Frontend: `frontend/.env` sets `REACT_APP_BACKEND_URL` (default `http://localhost:8001`).

## Notes
- Password reset: no email service is wired in, so the reset link is printed in the backend terminal.
- Plan prices and limits, SASB industry metrics (6 starter industries in `backend/sasb_data.py`), and the dashboard "projects" and "data gaps" formulas were not visible in the original, so they were recreated. Adjust them as needed.
- One fix compared with the original: `/flagship` was missing from the router in `App.js`, so the sidebar link redirected to the dashboard. The route has been added.
- To reset all data, delete `backend/sustainability360.db`.
