.PHONY: dev dev-web dev-server build build-web build-server test test-web test-server check check-web check-server clean docker-up docker-down docker-build

# Development
dev: dev-server dev-web

dev-web:
	cd web && yarn dev

dev-server:
	cd server && cargo run

# Build
build: build-web build-server

build-web:
	cd web && yarn build

build-server:
	cd server && cargo build --release

# Test
test: test-web test-server

test-web:
	cd web && yarn test

test-server:
	cd server && cargo test

# Check/Lint
check: check-web check-server

check-web:
	cd web && yarn check:ts && yarn check:lint

check-server:
	cd server && cargo clippy && cargo fmt --check

# Docker
docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

docker-build:
	docker-compose build

# Clean
clean:
	cd web && rm -rf .next node_modules
	cd server && cargo clean