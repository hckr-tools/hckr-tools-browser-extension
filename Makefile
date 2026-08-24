.DEFAULT_GOAL := help

NPM ?= npm
DEV_PORT ?= 5173
DEV_PORTS ?= 5173
TMUX_SESSION ?= hckr-dev

.PHONY: help install dev build clean zip lint test-e2e test-e2e-headed test-e2e-ui verify \
	stop-port dev-kill-ports dev-tmux \
	__dev-tmux-create __dev-tmux-start-panes __dev-tmux-open

help: ## Show available commands
	@printf "Usage: make <target>\n\n"
	@awk 'BEGIN {FS = ":.*## "}; /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install project dependencies
	$(NPM) install

dev: ## Start Vite watch build for extension development
	$(NPM) run dev

build: ## Typecheck and build production extension bundle in dist/
	$(NPM) run build

clean: ## Remove build outputs and packaging archives
	$(NPM) run clean

zip: build ## Build and create Chrome Web Store distribution zip (hckr-extension.zip)
	$(NPM) run zip

lint: ## Run TypeScript typecheck
	$(NPM) run lint

test-e2e: ## Run Playwright end-to-end tests headless
	$(NPM) run test:e2e

test-e2e-headed: ## Run Playwright end-to-end tests in headed browser mode
	$(NPM) run test:e2e:headed

test-e2e-ui: ## Run Playwright tests with interactive UI mode
	$(NPM) run test:e2e:ui

verify: ## Run standard repository checks (lint, build, zip)
	$(MAKE) lint
	$(MAKE) build
	$(MAKE) zip

# Port & process management
stop-port:
	@test -n "$(PORT)" || (echo "PORT is required. Example: make stop-port PORT=8878" && exit 1)
	@pids="$$(lsof -tiTCP:$(PORT) -sTCP:LISTEN 2>/dev/null || true)"; \
	if [ -n "$$pids" ]; then \
		echo "Stopping existing listener(s) on port $(PORT): $$pids"; \
		kill $$pids 2>/dev/null || true; \
		for attempt in 1 2 3 4 5; do \
			active=""; \
			for pid in $$pids; do kill -0 "$$pid" 2>/dev/null && active="$$active $$pid"; done; \
			[ -z "$$active" ] && break; \
			sleep 1; \
		done; \
		if [ -n "$$active" ]; then \
			echo "Force-stopping listener(s) on port $(PORT): $$active"; \
			kill -KILL $$active 2>/dev/null || true; \
		fi; \
	fi

dev-kill-ports: ## Stop local dev processes on ports $(DEV_PORTS)
	@command -v lsof >/dev/null 2>&1 || { echo "lsof is required to find old dev processes."; exit 1; }
	@for port in $(DEV_PORTS); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			for pid in $$pids; do \
				cmd=$$(ps -p "$$pid" -o command= 2>/dev/null || true); \
				echo "Stopping process $$pid on port $$port ($$cmd)"; \
				kill "$$pid" 2>/dev/null || true; \
			done; \
		fi; \
	done; \
	sleep 1; \
	for port in $(DEV_PORTS); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			for pid in $$pids; do \
				kill -9 "$$pid" 2>/dev/null || true; \
			done; \
		fi; \
	done

# Tmux development environment
dev-tmux: ## Start dev stack in a tiled tmux session (extension watch build, devdocs, shell)
	@command -v tmux >/dev/null 2>&1 || { echo "tmux is required. Install it with: brew install tmux"; exit 1; }
	@set -e; session="$(TMUX_SESSION)"; \
	if tmux has-session -t "$$session" 2>/dev/null; then \
		echo "Opening existing $$session tmux session..."; \
	else \
		$(MAKE) --no-print-directory __dev-tmux-create TMUX_SESSION="$$session"; \
	fi; \
	$(MAKE) --no-print-directory __dev-tmux-open TMUX_SESSION="$$session"

__dev-tmux-create:
	@session="$(TMUX_SESSION)"; \
	tmux new-session -d -s "$$session" -n dev -c "$$(pwd)"; \
	tmux split-window -h -t "$$session:dev.0" -c "$$(pwd)"; \
	tmux split-window -v -t "$$session:dev.1" -c "$$(pwd)"; \
	tmux select-layout -t "$$session:dev" tiled; \
	$(MAKE) --no-print-directory __dev-tmux-start-panes TMUX_SESSION="$$session"

__dev-tmux-start-panes:
	@session="$(TMUX_SESSION)"; \
	tmux send-keys -t "$$session:dev.0" "make dev" C-m; \
	tmux send-keys -t "$$session:dev.1" "make test-e2e" C-m; \
	tmux send-keys -t "$$session:dev.2" "clear; echo 'hckr developer shell ready. Run tests with make test-e2e'" C-m

__dev-tmux-open:
	@session="$(TMUX_SESSION)"; \
	if [ -n "$$TMUX" ]; then \
		tmux switch-client -t "$$session"; \
	else \
		tmux attach-session -t "$$session"; \
	fi
