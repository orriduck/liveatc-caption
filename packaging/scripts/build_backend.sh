#!/bin/bash
set -e

# Navigate to the backend directory
cd "$(dirname "$0")/../../backend"

echo "Building backend with PyInstaller..."

# Run PyInstaller
# --onedir: create a directory containing the executable and all dependencies
# --name backend_app: name of the executable
uv run pyinstaller --noconfirm --onedir --console --name "backend_app" \
    --collect-all faster_whisper \
    --collect-all google.genai \
    --add-data "../frontend/dist:static" \
    main.py

echo "Backend build complete. Output in backend/dist/backend_app"
