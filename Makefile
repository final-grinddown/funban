.PHONY: dev dev-web dev-server build build-web build-server test test-web test-server check check-web check-server fix fix-web fix-server scripts format contracts sqlx-prepare precommit precommit-web precommit-server docker-up docker-down docker-build clean kill-dev

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Development
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Start development servers
dev-web:
	cd web && yarn install --silent && yarn dev

dev-server:
	cd server && cargo run

# Kill any running dev processes
kill-dev:
	@pkill -f "funban-server" || true
	@pkill -f "yarn dev" || true

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Build
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

build: build-server build-web

build-web:
	cd web && yarn install --silent && yarn build

build-server:
	cd server && cargo build --release

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Test
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test: test-server test-web

test-web:
	cd web && yarn install --silent && yarn test

test-server:
	cd server && cargo test

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Check/Lint (read-only verification)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

check: check-server check-web

check-web:
	cd web && yarn check:ts && yarn check:lint

check-server:
	cd server && cargo clippy -- -D warnings && cargo fmt --check

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Scripts (make active changes - run before precommit)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Auto-fix all formatting and linting issues (run this before committing!)
fix: fix-server fix-web
	@echo "✨ All auto-fixes applied!"

fix-server:
	@echo "🦀 Fixing Rust formatting and linting..."
	cd server && cargo fmt
	cd server && cargo clippy --fix --allow-dirty --allow-staged --all-targets --all-features
	@echo "📊 Regenerating SQLx offline data..."
	cd server && cargo sqlx prepare --workspace -- --all-targets --all-features --bins --tests

fix-web:
	@echo "⚛️  Fixing web formatting and linting..."
	cd web && yarn prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss,md}"
	cd web && yarn check:lint:fix

# Run all server scripts: formatting, contracts generation, SQLx prepare
# Use this before committing to ensure all generated files are up to date
scripts: format contracts sqlx-prepare

# Format Rust code
format:
	cd server && cargo fmt

# Generate TypeScript contracts from Rust types
contracts:
	cd server && cargo test export_bindings

# Prepare SQLx offline data (run after changing migrations or database queries)
sqlx-prepare:
	cd server && cargo sqlx prepare --workspace -- --all-targets --all-features --bins --tests

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Precommit (comprehensive validation - run before committing)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Run all precommit checks (server first because it generates contracts)
precommit: precommit-server precommit-web
	@echo "✅ All precommit checks passed!"

precommit-web:
	@echo "🔍 Running web precommit checks..."
	cd web && yarn install --silent && yarn check:ts && yarn check:lint && yarn test && yarn build

precommit-server:
	@echo "🔍 Running server precommit checks..."
	cd server && cargo build && cargo fmt --check && cargo clippy -- -D warnings && cargo test && cargo sqlx prepare --check -- --bins --tests
	@echo "📋 Checking if contracts need to be committed..."
	@if ! git diff --quiet contracts/; then \
		echo "⚠️  Contract files have uncommitted changes - please review and commit them"; \
		git status contracts/; \
		exit 1; \
	fi

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Docker
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-build:
	docker compose build

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Clean
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

clean:
	cd web && rm -rf .next node_modules
	cd server && cargo clean
