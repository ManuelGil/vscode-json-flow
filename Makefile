# ============================================================
# Makefile - Repository Interface
# DX-first, explicit, portable, Open Source friendly
#
# This Makefile defines the OFFICIAL way to interact with
# this repository.
#
# - pnpm is intentionally required
# - Do NOT use npm or yarn
# - Do NOT bypass Makefile targets in documentation
#
# Node.js version is defined in `.nvmrc`
# Environment loading is handled via `.envrc` (direnv)
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
# Package manager (explicit)
# ------------------------------------------------------------

PKG_MANAGER = pnpm

# ------------------------------------------------------------
# Help
# ------------------------------------------------------------

.PHONY: help
help:
	@echo "$(BOLD)Repository commands$(RESET)"
	@echo ""
	@echo "$(BOLD)Common workflow:$(RESET)"
	@echo "  make install     Install dependencies"
	@echo "  make build       Build the project"
	@echo ""
	@echo "$(BOLD)Available commands:$(RESET)"
	@echo "  make install     Install dependencies (pnpm, strict)"
	@echo "  make build       Build the project"
	@echo "  make watch       Build in watch mode"
	@echo "  make test        Run tests"
	@echo "  make typecheck   Run TypeScript checks"
	@echo "  make doctor      Show environment diagnostics"
	@echo ""
	@echo "$(BLUE)Notes:$(RESET)"
	@echo "- pnpm is required and intentionally enforced."
	@echo "- Node.js version is defined in .nvmrc."
	@echo "- If using direnv and you see a blocked message,"
	@echo "  run: direnv allow (once) and re-enter the directory."
	@echo "- Disable colors with NO_COLOR=1."

# ------------------------------------------------------------
# Validation
# ------------------------------------------------------------

.PHONY: pm
pm:
	@command -v pnpm >/dev/null 2>&1 || { \
		echo "$(RED)ERROR: pnpm is required but not installed.$(RESET)"; \
		echo ""; \
		echo "Install pnpm and re-run:"; \
		echo "  make install"; \
		exit 1; \
	}
	@echo "$(GREEN)Using package manager:$(RESET) $(BOLD)pnpm$(RESET)"

# ------------------------------------------------------------
# Core targets
# ------------------------------------------------------------

.PHONY: install
install: pm
	@echo "$(GREEN)Installing dependencies (strict mode)$(RESET)"
	@$(PKG_MANAGER) install --frozen-lockfile --ignore-scripts

.PHONY: build
build: pm
	@echo "$(GREEN)Building project$(RESET)"
	@$(PKG_MANAGER) run build

.PHONY: watch
watch: pm
	@echo "$(GREEN)Starting watch mode$(RESET)"
	@$(PKG_MANAGER) run watch

.PHONY: test
test: pm
	@echo "$(GREEN)Running tests$(RESET)"
	@$(PKG_MANAGER) test

.PHONY: typecheck
typecheck: pm
	@echo "$(GREEN)Running TypeScript checks$(RESET)"
	@$(PKG_MANAGER) run typecheck

# ------------------------------------------------------------
# Diagnostics
# ------------------------------------------------------------

.PHONY: doctor
doctor:
	@echo "$(BOLD)Environment diagnostics$(RESET)"
	@echo ""
	@echo "Node:  $$(node --version 2>/dev/null || echo not found)"
	@echo "pnpm:  $$(pnpm --version 2>/dev/null || echo not found)"
	@echo ""
	@if command -v direnv >/dev/null 2>&1; then \
		echo "direnv: installed"; \
		direnv status; \
	else \
		echo "direnv: not installed (optional)"; \
	fi
	@echo ""
	@echo "$(BLUE)Tip:$(RESET) Include this output when reporting issues."
