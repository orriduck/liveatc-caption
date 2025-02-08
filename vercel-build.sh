#!/bin/bash

# Install and setup uv for Python dependencies
curl -LsSf https://astral.sh/uv/install.sh | sh
uv pip install -e .

# Install and build frontend
pnpm install
pnpm build