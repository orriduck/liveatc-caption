.PHONY: dev

# Start backend (port 8000) and frontend (port 5173) together.
# Ctrl-C stops both.
dev:
	@(cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload) & \
	trap "kill %1 2>/dev/null" EXIT; \
	PATH="/opt/homebrew/bin:$$PATH" pnpm --dir frontend dev
