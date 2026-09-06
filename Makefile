# BeerBuddy — everything runs under podman. There is nothing to install on the
# host except podman itself.
#
#   make init     first time, or after pulling changes
#   make up       start the stack
#   make down     stop it
#   make help     the rest

COMPOSE      := podman compose -f compose.yaml
COMPOSE_PROD := podman compose -f compose.prod.yaml
COMPOSE_E2E  := podman compose -f compose.yaml -f compose.e2e.yaml

# One-off container for running a tool against a package without a host toolchain.
BUN_IMAGE := docker.io/oven/bun:1.4.2-slim

# Only needed so `make typecheck` can run the frontend build, which refuses to
# produce a bundle without it.
VITE_APP_BACKEND_URL ?= http://localhost:3000/api
# The whole repo is mounted, not just the package: the frontend type-checks against
# ../backend/src, and mounting only frontend/ collapses every API type to unknown.
RUN_IN     = podman run --rm -v "$(CURDIR)":/repo:Z -w /repo/$(1) --userns=keep-id \
               -e VITE_APP_BACKEND_URL=$(VITE_APP_BACKEND_URL) $(BUN_IMAGE)

.DEFAULT_GOAL := help
.PHONY: help init env install up up-build down restart restart-backend dev-backend \
        logs logs-backend logs-db ps \
        psql shell-backend seed reset test test-backend test-frontend test-e2e \
        lint format format-check typecheck check build prod-up prod-down clean nuke

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------

env: ## Create .env files from the examples, without overwriting existing ones
	@for d in . backend frontend; do \
		if [ ! -f "$$d/.env" ]; then cp "$$d/.env.example" "$$d/.env"; echo "created $$d/.env"; \
		else echo "kept $$d/.env"; fi; \
	done

install: ## Resolve dependencies and write lockfiles
	$(call RUN_IN,backend) bun install
	$(call RUN_IN,frontend) bun install

init: env install up-build ## First-time setup: env files, dependencies, build and start
	@echo ""
	@echo "  frontend  http://localhost:5173"
	@echo "  api       http://localhost:3000/api/beers"
	@echo "  database  postgres://localhost:5433/beers"

# --- running -----------------------------------------------------------------

up: ## Start the stack in the background
	$(COMPOSE) up -d

up-build: ## Rebuild images, then start
	$(COMPOSE) up -d --build

down: ## Stop the stack, keeping the database volume
	$(COMPOSE) down

restart: down up ## Stop and start

restart-backend: ## Reload backend code after an edit
	$(COMPOSE) restart backend

logs: ## Follow all logs
	$(COMPOSE) logs -f

logs-backend: ## Follow backend logs
	$(COMPOSE) logs -f backend

logs-db: ## Follow database logs
	$(COMPOSE) logs -f db

ps: ## Show service status
	$(COMPOSE) ps

psql: ## Open a psql shell on the running database
	$(COMPOSE) exec db psql -U beerbuddy -d beers

shell-backend: ## Open a shell in the backend container
	$(COMPOSE) exec backend sh

dev-backend: ## Run only the database in podman, backend on the host with working hot reload
	$(COMPOSE) up -d db
	@echo "needs host bun >= 1.2 (bun upgrade); Ctrl-C to stop"
	cd backend && DATABASE_URL=postgres://beerbuddy:beerbuddy@localhost:5433/beers bun --hot src/index.ts

# --- data --------------------------------------------------------------------

seed: ## Regenerate backend/db/02-seed.sql from the CSVs
	$(call RUN_IN,backend) bun run seed:build

reset: ## Destroy the database volume and start fresh — DELETES ALL LOCAL DATA
	$(COMPOSE) down -v
	$(COMPOSE) up -d
	@echo "database recreated from backend/db/"

# --- checks ------------------------------------------------------------------

test: test-backend test-frontend ## Run both unit suites

test-backend: ## Run backend tests against a throwaway database
	$(COMPOSE) up -d db
	podman run --rm -v "$(CURDIR)":/repo:Z -w /repo/backend --userns=keep-id \
		--network beerbuddy_default \
		-e DATABASE_URL=postgres://beerbuddy:beerbuddy@db:5432/beers \
		$(BUN_IMAGE) bun test

test-frontend: ## Run frontend unit tests
	$(call RUN_IN,frontend) bun run test:unit

test-e2e: ## Run Playwright against a disposable stack on its own ports
	$(COMPOSE_E2E) up -d --build
	- cd frontend && bun run test:e2e
	$(COMPOSE_E2E) down -v

lint: ## Lint both packages
	$(call RUN_IN,backend) bun run lint
	$(call RUN_IN,frontend) bun run lint

format: ## Format both packages
	$(call RUN_IN,backend) bun run prettier:write
	$(call RUN_IN,frontend) bun run prettier:write

format-check: ## Check formatting
	$(call RUN_IN,backend) bun run prettier:check
	$(call RUN_IN,frontend) bun run prettier:check

typecheck: ## Type-check both packages
	$(call RUN_IN,backend) bun run typecheck
	$(call RUN_IN,frontend) bun run build

check: lint format-check typecheck test ## Everything CI runs

# --- production --------------------------------------------------------------

build: ## Build the production image
	$(COMPOSE_PROD) build

prod-up: ## Run the production stack on :8080
	$(COMPOSE_PROD) up -d --build
	@echo "  app  http://localhost:8080"

prod-down: ## Stop the production stack
	$(COMPOSE_PROD) down

# --- cleanup -----------------------------------------------------------------

clean: ## Stop every stack and remove their volumes
	- $(COMPOSE) down -v
	- $(COMPOSE_E2E) down -v
	- $(COMPOSE_PROD) down -v

nuke: clean ## clean, plus locally built images and node_modules
	- podman image rm -f localhost/beerbuddy_backend localhost/beerbuddy_frontend localhost/beerbuddy-prod_app
	rm -rf backend/node_modules frontend/node_modules
