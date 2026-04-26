.PHONY: dev

PNPM ?= $(shell command -v pnpm 2>/dev/null || printf /opt/homebrew/bin/pnpm)

# Start the frontend dev server on port 5173.
dev:
	@test -x "$(PNPM)" || (echo "pnpm not found. Install it or set PNPM=/path/to/pnpm." && exit 1)
	"$(PNPM)" --dir frontend dev
