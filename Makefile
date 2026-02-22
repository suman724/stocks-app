.PHONY: dev build test lint format clean install setup e2e-setup e2e-smoke

NPM_CACHE ?= /tmp/npm-cache-stocks

# Setup project
setup: install
	@echo "Setup complete. You can now run 'make dev'."

# Install frontend dependencies
install:
	npm install --cache $(NPM_CACHE)

# Run the app in development mode
dev:
	export PATH="$$HOME/.cargo/bin:$$PATH" && npm run tauri dev

# Build the app for production (macOS/Windows depending on host)
build:
	export PATH="$$HOME/.cargo/bin:$$PATH" && npm run tauri build

# Run all tests (Frontend + Backend)
test: test-frontend test-backend

test-frontend:
	npm run test -- --run

test-backend:
	cd src-tauri && cargo test

# Install desktop E2E harness dependencies
e2e-setup:
	npm --prefix e2e install --cache $(NPM_CACHE)

# Run desktop smoke E2E tests (WebDriver + tauri-driver)
e2e-smoke:
	export PATH="$$HOME/.cargo/bin:$$PATH" && npm run e2e:smoke

# Run linters
lint: lint-frontend lint-backend

lint-frontend:
	npm run lint

lint-backend:
	cd src-tauri && cargo clippy -- -D warnings

# Format code
format: format-frontend format-backend

format-frontend:
	npx prettier --write .

format-backend:
	cd src-tauri && cargo fmt

# Clean build artifacts
clean:
	rm -rf node_modules
	rm -rf src-tauri/target
