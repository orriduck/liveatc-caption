from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.database import Database
from api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection
    db = Database()
    yield


app = FastAPI(
    title="LiveATC Backend API",
    description="Backend service for LiveATC audio channel metadata and streaming",
    version="0.1.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(api_router)


@app.get("/")
async def read_root():
    """Root endpoint to check API status"""
    return {
        "status": "ok",
        "message": "LiveATC Backend API is running",
        "version": "0.1.0",
    }
