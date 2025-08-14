"""quick note: tiny FastAPI backend for the demo. just /health for now, so we can add real endpoints later without rewiring."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="fix-demo-backend")

# dev-friendly CORS — fine for demo, tighten later when adding real endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    """one-liner: simple liveness check so ops/devs can see the server is up."""
    return {"ok": True}
