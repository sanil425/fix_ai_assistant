# FIX API Backend

FastAPI application exposing FIX engine functionality for building, parsing, validating, and explaining FIX messages.

## Run

### Option 1: From project root
```bash
uvicorn backend.api:app --reload --port 8000
```

### Option 2: From backend directory
```bash
cd backend
uvicorn --app-dir backend api:app --reload --port 8000
```

## Quick Import Check
```bash
python -c "import backend.api as m; print(type(m.app))"
```
Should print: `<class 'fastapi.applications.FastAPI'>`

## Endpoints
- `GET /healthz` - Health check
- `POST /fix/build` - Build FIX message
- `POST /fix/parse` - Parse FIX message
- `POST /fix/validate` - Validate FIX message
- `POST /fix/explain` - Explain FIX message
- `GET /fix/lookup` - Look up FIX field information

## API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.
