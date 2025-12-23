from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os
import sys
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from api.router.search import router as search_router
from api.router.caption import router as caption_router

app = FastAPI(title="LiveATC Caption App")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")
app.include_router(caption_router, prefix="/ws")

# Serve static files from the frontend build
if getattr(sys, "frozen", False):
    # Running in a bundle
    base_path = sys._MEIPASS
    frontend_path = os.path.join(base_path, "static")
else:
    # Running in development
    frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")


load_dotenv()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/config")
async def config():
    return {
        "has_env_key": bool(os.environ.get("GEMINI_API_KEY")),
    }


# Catch-all route to serve index.html for SPA routing
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Frontend build not found"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
