.PHONY: dev

UV ?= $(shell command -v uv 2>/dev/null || printf /opt/homebrew/bin/uv)
PNPM ?= $(shell command -v pnpm 2>/dev/null || printf /opt/homebrew/bin/pnpm)

# Start backend (port 8000) and frontend (port 5173) together.
# Ctrl-C stops both.
dev:
	@test -x "$(UV)" || (echo "uv not found. Install it or set UV=/path/to/uv." && exit 1)
	@test -x "$(PNPM)" || (echo "pnpm not found. Install it or set PNPM=/path/to/pnpm." && exit 1)
	@(cd backend && "$(UV)" run python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) & \
	backend_pid=$$!; \
	trap "kill $$backend_pid 2>/dev/null" EXIT INT TERM; \
	"$(PNPM)" --dir frontend dev
