from fastapi import FastAPI
from .api.router import api_router
from .services.db_init import init_database

app = FastAPI(
    title="LiveATC Backend API",
    description="Backend service for LiveATC audio channel metadata and streaming",
    version="0.1.0"
)

# Initialize database once
db = init_database()

# Include routers
app.include_router(api_router)

@app.get("/")
async def read_root():
    """Root endpoint to check API status"""
    return {
        "status": "ok",
        "message": "LiveATC Backend API is running",
        "version": "0.1.0"
    }

# Remove duplicate initialization
# @app.on_event("startup")
# async def startup_event():
#     """Run startup tasks"""
#     # Initialize database connection
#     init_database() 