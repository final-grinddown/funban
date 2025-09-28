.PHONY: dev-web dev-server build build-web build-server test test-web test-server check check-web check-server precommit precommit-web precommit-server clean docker-up docker-down docker-build kill-dev

# Development
dev-web:
	cd web && yarn install --silent && yarn dev

dev-server:
	cd server && cargo run

# Build
build: build-web build-server

build-web:
	cd web && yarn install --silent && yarn build

build-server:
	cd server && cargo build --release

# Test
test: test-web test-server

test-web:
	cd web && yarn install --silent && yarn test

test-server:
	cd server && cargo test

# Check/Lint
check: check-web check-server

# Precommit checks - run before committing
precommit: precommit-web precommit-server
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

check-web:
	cd web && yarn check:ts && yarn check:lint

check-server:
	cd server && cargo clippy -- -D warnings && cargo fmt --check

# Docker
docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-build:
	docker compose build

# Clean
clean:
	cd web && rm -rf .next node_modules
	cd server && cargo clean

# Kill any running dev processes
kill-dev:
	@pkill -f "funban-server" || true
	@pkill -f "yarn dev" || true