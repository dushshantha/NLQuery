# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api import routes

from fastapi.responses import JSONResponse
from .core.errors import ErrorResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if hasattr(exc, "detail") and isinstance(exc.detail, dict):
        return JSONResponse(
            status_code=getattr(exc, "status_code", 500),
            content=exc.detail
        )

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail=str(exc),
            error_type="unknown_error"
        ).dict()
    )

