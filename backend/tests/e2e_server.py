"""Starts the real FastAPI app on port 8001 with the deterministic FakeLLM injected (e2e tests only)."""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./e2e.db"
os.environ["API_KEYS"] = ""
os.environ["CORS_ORIGINS"] = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import uvicorn

from app.services.ai_service import set_llm_client
from tests.fake_llm import FakeLLM

if os.path.exists("e2e.db"):
    os.remove("e2e.db")
set_llm_client(FakeLLM())
uvicorn.run("app.main:app", host="127.0.0.1", port=8001)
