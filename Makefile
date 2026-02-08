# ============================================================
# Makefile - VS Code Extension
# DX-first, portable, explicit, Open Source friendly
#
# This Makefile is OPTIONAL.
# You can always use npm / pnpm / yarn directly.
# ============================================================

SHELL := /bin/sh
.DEFAULT_GOAL := help

# ------------------------------------------------------------
# Colors (optional)
# Disable with: NO_COLOR=1 make <target>
# ------------------------------------------------------------

ifeq ($(NO_COLOR),1)
	BOLD  :=
	GREEN :=
	YELLOW :=
	RED   :=
	BLUE  :=
	RESET :=
else
	BOLD  := \033[1m
	GREEN := \033[0;32m
	YELLOW:= \033[0;33m
	RED   := \033[0;31m
	BLUE  := \033[0;34m
	RESET := \033[0m
endif

# ------------------------------------------------------------
# Package manager resolution
#
# Priority:
# 1. PKG_MANAGER env var
# 2. .pkg-manager file
# 3. pnpm > yarn > npm
# ------------------------------------------------------------

PKG_MANAGER := $(shell \
	if [ -n "$$PKG_MANAGER" ]; then \
		echo "$$PKG_MANAGER"; \
	elif [ -f .pkg-manager ]; then \
		cat .pkg-manager; \
	elif command -v pnpm >/dev/null 2>&1; then \
		echo pnpm; \
	elif command -v yarn >/dev/null 2>&1; then \
		echo yarn; \
	elif command -v npm >/dev/null 2>&1; then \
		echo npm; \
	else \
		echo none; \
	fi \
)

# ------------------------------------------------------------
# Help
# ------------------------------------------------------------

.PHONY: help
help:
	@echo "$(BOLD)VS Code Extension - Development Commands$(RESET)"
	@echo ""
	@echo "$(BOLD)Common workflow:$(RESET)"
	@echo "  make install    Install dependencies"
	@echo "  make build      Build the extension"
	@echo ""
	@echo "$(BOLD)Available commands:$(RESET)"
	@echo "  make install    Install dependencies using npm / pnpm / yarn"
	@echo "  make build      Build the extension"
	@echo "  make watch      Build in watch mode"
	@echo "  make test       Run tests"
	@echo "  make doctor     Show environment diagnostics"
	@echo ""
	@echo "$(BLUE)Notes:$(RESET)"
	@echo "- This Makefile does NOT manage Node versions."
	@echo "- If you use direnv and see a 'blocked .envrc' message,"
	@echo "  run: direnv allow (once) and re-enter the directory."
	@echo "- You can disable colors with NO_COLOR=1."
	@echo ""

# ------------------------------------------------------------
# Package manager validation
# ------------------------------------------------------------

.PHONY: pm
pm:
	@if [ "$(PKG_MANAGER)" = "none" ]; then \
		echo "$(RED)ERROR: No package manager found.$(RESET)"; \
		echo ""; \
		echo "Please install one of the following:"; \
		echo "  - npm  (comes with Node.js)"; \
		echo "  - pnpm"; \
		echo "  - yarn"; \
		echo ""; \
		echo "Then re-run: make install"; \
		exit 1; \
	fi
	@echo "$(GREEN)Using package manager:$(RESET) $(BOLD)$(PKG_MANAGER)$(RESET)"

# ------------------------------------------------------------
# Core targets
# ------------------------------------------------------------

.PHONY: install
install: pm
	@echo "$(GREEN)Installing dependencies$(RESET)"
	@$(PKG_MANAGER) install

.PHONY: build
build: pm
	@echo "$(GREEN)Building VS Code extension$(RESET)"
	@$(PKG_MANAGER) run build

.PHONY: watch
watch: pm
	@echo "$(GREEN)Starting watch mode$(RESET)"
	@$(PKG_MANAGER) run watch

.PHONY: test
test: pm
	@echo "$(GREEN)Running tests$(RESET)"
	@$(PKG_MANAGER) test

# ------------------------------------------------------------
# Diagnostics
# ------------------------------------------------------------

.PHONY: doctor
doctor:
	@echo "$(BOLD)Environment diagnostics$(RESET)"
	@echo ""
	@echo "Node:   $$(node --version 2>/dev/null || echo not found)"
	@echo "npm:    $$(npm --version 2>/dev/null || echo not found)"
	@echo "pnpm:   $$(pnpm --version 2>/dev/null || echo not found)"
	@echo "yarn:   $$(yarn --version 2>/dev/null || echo not found)"
	@echo ""
	@if command -v direnv >/dev/null 2>&1; then \
		echo "direnv: installed"; \
		direnv status; \
	else \
		echo "direnv: not installed (optional)"; \
	fi
	@echo ""
	@echo "$(BLUE)Tip:$(RESET) If something does not work, include this output in issues."

# ------------------------------------------------------------
# End of file
# ------------------------------------------------------------
