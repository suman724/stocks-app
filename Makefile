.PHONY: dev build test lint format clean install setup

# Setup project
setup: install
	@echo "Setup complete. You can now run 'make dev'."

# Install frontend dependencies
install:
	npm install

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
