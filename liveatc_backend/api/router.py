from fastapi import APIRouter
from .endpoints import airport, search

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    airport.router,
    prefix="/airport",
    tags=["airport"]
)
api_router.include_router(
    search.router,
    prefix="/search",
    tags=["search"]
) 