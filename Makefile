# =============================================================================
# Karate System — Makefile
# Run `make help` to see available commands.
# =============================================================================

.DEFAULT_GOAL := help
.PHONY: help install dev build start test typecheck lint clean \
        db-push db-status db-seed db-reset supabase-login \
        check setup

# ----------------------------------------------------------------------------
# Help (default target)
# ----------------------------------------------------------------------------
help:
	@echo ""
	@echo "  Karate System"
	@echo "  ─────────────────────────────────────────────────────────────"
	@echo ""
	@echo "  Quick start:"
	@echo "    make setup        First-time setup (install deps + DB push)"
	@echo "    make dev          Start dev server (http://localhost:3000)"
	@echo ""
	@echo "  Development:"
	@echo "    make install      Install all dependencies (pnpm)"
	@echo "    make dev          Start Next.js dev server"
	@echo "    make build        Production build"
	@echo "    make start        Run production build"
	@echo "    make test         Run all unit tests"
	@echo "    make typecheck    TypeScript typecheck all packages"
	@echo "    make lint         Lint all packages"
	@echo "    make check        Run typecheck + test (CI gate)"
	@echo "    make clean        Remove build artifacts and node_modules"
	@echo ""
	@echo "  Supabase (DB):"
	@echo "    make supabase-login   Authenticate with Supabase CLI"
	@echo "    make db-push          Apply pending migrations to remote DB"
	@echo "    make db-status        Show migration status"
	@echo "    make db-seed          Print seed.sql instructions"
	@echo "    make db-reset         (DANGER) Drop & recreate remote DB"
	@echo ""

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------
setup: install
	@echo ""
	@echo "  Step 1 of 2 complete: dependencies installed."
	@echo ""
	@echo "  Next, link your Supabase project (one-time):"
	@echo "    supabase login"
	@echo "    supabase link --project-ref <YOUR_PROJECT_REF>"
	@echo "    make db-push"
	@echo ""
	@echo "  Then start the dev server:"
	@echo "    make dev"
	@echo ""

# ----------------------------------------------------------------------------
# Development
# ----------------------------------------------------------------------------
install:
	pnpm install

dev:
	pnpm --filter @karate/web dev

build:
	pnpm -r build

start:
	pnpm --filter @karate/web start

test:
	pnpm -r test

typecheck:
	pnpm -r typecheck

lint:
	pnpm -r lint

check: typecheck test

clean:
	@echo "Removing build artifacts and node_modules..."
	rm -rf node_modules
	rm -rf apps/*/node_modules apps/*/.next
	rm -rf packages/*/node_modules packages/*/dist
	@echo "Done."

# ----------------------------------------------------------------------------
# Supabase
# ----------------------------------------------------------------------------
supabase-login:
	supabase login

db-push:
	supabase db push

db-status:
	supabase migration list

db-seed:
	@echo ""
	@echo "  Seed data is in supabase/seed.sql"
	@echo "  Apply via Supabase Dashboard -> SQL Editor, or:"
	@echo "    psql \"\$$SUPABASE_DB_URL\" -f supabase/seed.sql"
	@echo ""

db-reset:
	@echo "WARNING: this drops and recreates all tables on the remote DB."
	@read -p "Continue? [y/N] " ans && [ "$$ans" = "y" ] || (echo "Aborted." && exit 1)
	supabase db reset --linked
