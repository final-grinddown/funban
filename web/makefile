help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

run-dev: ## Run local development environment
	yarn dev

build-prod: ## Create production build
	yarn build

run-prod: ## Run production environment
	yarn start

check: ## TS and ESLint checks
	yarn check:ts && yarn run check:lint
