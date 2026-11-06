import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.database.session import init_db

log = logging.getLogger("qualiscope")


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    setup_logging(s.log_level)
    init_db()
    if not s.auth_enabled:
        log.warning("API_KEYS not set: authentication is DISABLED (development mode).")
    if not s.anthropic_api_key:
        log.warning("ANTHROPIC_API_KEY not set: AI endpoints will return 503.")
    yield


app = FastAPI(title="QualiScope AI Requirement Analyzer", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=get_settings().cors_origin_list, allow_methods=["*"],
    allow_headers=["*"], expose_headers=["Content-Disposition"],
)
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
