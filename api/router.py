from fastapi import APIRouter

from .endpoints import airport

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(airport.router, prefix="/api/airport", tags=["airport"])
