.PHONY: build test lint typecheck release clean

build:  ## Build: typegen + tsc
	npm run build

test:  ## Run unit tests
	npm test

lint:  ## Run ESLint
	npm run lint

lint-fix:  ## Auto-fix ESLint issues
	npm run lint:fix

typecheck:  ## Type-check without emitting
	npm run typecheck

typegen:  ## Regenerate types from OpenAPI spec
	npm run typegen

clean:  ## Remove build artifacts
	rm -rf dist

release:  ## Release a new version: make release VERSION=0.1.0
	@test -n "$(VERSION)" || (echo "Usage: make release VERSION=x.y.z" && exit 1)
	./scripts/release.sh $(VERSION)

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
