#!/bin/bash

# Install dependencies
pip install -r requirements.txt

# Install and build frontend
pnpm install
pnpm build