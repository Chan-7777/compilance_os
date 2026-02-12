import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import risk, checklist, alerts, fta, shipments, public, admin
from app.scrapers.scheduler import setup_scheduler, shutdown_scheduler

logger = logging.getLogger("complianceos")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: launch scraper scheduler. Shutdown: stop it."""
    setup_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="ComplianceOS API",
    description="Export compliance and risk management API for Indian exporters",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(risk.router)
app.include_router(checklist.router)
app.include_router(alerts.router)
app.include_router(fta.router)
app.include_router(shipments.router)
app.include_router(public.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {
        "service": "ComplianceOS API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
