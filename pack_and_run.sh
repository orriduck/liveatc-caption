#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "${BLUE}Step 1: Building Frontend...${NC}"
cd frontend
npm run build
cd ..

echo "${BLUE}Step 2: Bundling Python Backend (this may take a few minutes)...${NC}"
./packaging/scripts/build_backend.sh

echo "${BLUE}Step 3: Packaging Electron App...${NC}"
cd packaging/electron
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist
cd ../..

echo "${GREEN}Build Complete!${NC}"
echo "The app is located at: ${BLUE}packaging/electron/dist/mac-arm64/LiveATC Caption.app${NC}"

# Ask to run the app
read -p "Would you like to run the app now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "${BLUE}Launching LiveATC Caption...${NC}"
    open "packaging/electron/dist/mac-arm64/LiveATC Caption.app"
fi
