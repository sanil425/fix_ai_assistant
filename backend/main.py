from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.ask import router as ask_router

app = FastAPI()

# Dev-friendly CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check (for quick sanity)
@app.get("/health")
def health():
    return {"ok": True}

# AI route(s)
app.include_router(ask_router, prefix="/api")

# Uvicorn entrypoint: uvicorn main:app --reload
