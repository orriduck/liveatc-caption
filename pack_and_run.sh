#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "${BLUE}Step 1: Building Frontend...${NC}"
cd frontend
pnpm install --frozen-lockfile
pnpm run build
cd ..

echo "${BLUE}Step 2: Packaging Electron App...${NC}"
cd packaging/electron
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm install --frozen-lockfile
pnpm run dist
cd ../..

echo "${GREEN}Build Complete!${NC}"
echo "The app is located at: ${BLUE}packaging/electron/dist/mac-arm64/ADSBao.app${NC}"

# Ask to run the app
read -p "Would you like to run the app now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "${BLUE}Launching ADSBao...${NC}"
    open "packaging/electron/dist/mac-arm64/ADSBao.app"
fi
