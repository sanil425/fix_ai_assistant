# FIX Assistant — demo mode (no AI)

- Chat page with left sidebar and **placeholder** answers (no network calls).
- **Bottom FIX Toolbar** embedded at the page bottom; builds NewOrderSingle locally (correct BodyLength/CheckSum) and saves to blotter in localStorage.

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

## Optional: minimal backend (for health check only)
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
# health: http://localhost:8000/health
```

later: we can add real endpoints under backend/ without changing the frontend demo.
