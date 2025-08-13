# AI Chat Wiring — FastAPI + React

## Backend
1. cd backend
2. cp .env.example .env
3. Put your key in `.env`:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```
4. pip install -r requirements.txt
5. Run: `uvicorn backend.main:app --reload --port 8000`
6. Health check: http://localhost:8000/health → `{"ok": true}`

## Frontend
1. cd frontend (or project root if single app)
2. cp .env.example .env
3. Ensure `.env` has `VITE_API_BASE=http://localhost:8000`
4. npm install
5. npm run dev

## Test
- In the app, ask: "Build a 100 AAPL limit buy."
- Expected: plain-English answer + optional `action` JSON in the response (view DevTools → Network → POST /api/ask).

## Notes
- **Do not** run any Node/Express `/ask` server; it's disabled. Use FastAPI `/api/ask`.
- If you see `Error loading ASGI app. Could not import module "main".` run either:
  - `uvicorn backend.main:app --reload --port 8000` (from repo root), or
  - `cd backend && uvicorn main:app --reload --port 8000`.

## Verification Checklist
- [ ] http://localhost:8000/health returns {"ok":true}
- [ ] POST http://localhost:8000/api/ask with {"user_prompt":"What is tag 55?"} returns 200 with answer text
- [ ] Frontend Network tab shows a single call to /api/ask (no calls to /ask or port 4000)
- [ ] If OPENAI_API_KEY missing → backend returns 500 with clear message
- [ ] CORS errors are gone (FastAPI allows all during dev)

## Troubleshooting
- **Port 8000 in use**: `lsof -ti:8000 | xargs kill -9`
- **Import errors**: Ensure you're running from the correct directory
- **API key not loaded**: Check `.env` file exists and has correct format
- **CORS issues**: FastAPI middleware should handle this automatically
