# AI Agent Instructions for Stocks App

## 1. Project Context

This is a cross-platform desktop application (macOS and Windows) built to track stock performance. The app allows users to manage a watchlist, view quote summaries, and see historical stock performance via interactive charts. It is built to be resilient, testable, and strictly adheres to a clean separation of concerns.

## 2. Tech Stack

- **Frontend**: React + TypeScript
- **Backend / Native Runtime**: Tauri v2 + Rust
- **Data Provider**: Twelve Data (Free tier)

## 3. Core Architectural Rules

**CRITICAL: When writing, modifying, or reviewing code for this project, you must strictly adhere to the following rules:**

### API & Data Security

- **No Direct Frontend Fetching**: The React frontend **must never** make direct HTTP network requests to the Twelve Data API (or any external market provider).
- **Tauri Bridge**: All provider communication must be routed securely through Tauri Rust commands.
- **Secret Management**: The API key is user-configurable via the app settings. It must be stored in the local Rust persistence layer and **never** hardcoded, exposed in the UI bundle, or printed in logs.

### Resilience & Cost Optimization (Free-Tier Friendly)

- **Local Caching**: Aggressively cache market quotes (e.g., 60s TTL) and time-series data (e.g., 5m TTL) in the Rust layer to prevent hitting Twelve Data's free-tier rate limits.
- **Graceful Degradation**: If an API request fails (rate limit, timeout, offline), the app **must not crash**. It should fallback to serving the last known cached data and return an appropriate status (e.g., `stale` or `error`) to display an inline warning UI.

### Provider Abstraction

- All Twelve Data specific logic (URL building, JSON parsing, error handling) must be isolated within a adapter (e.g., `TwelveDataAdapter`) in Rust.
- This adapter must implement a generic `MarketDataProvider` trait/interface. This ensures the Core Commands and UI do not care _which_ provider is currently supplying the market data.

### Frontend Guidelines (React/TS)

- Prefer strict TypeScript typing for all state and Data Transfer Objects (DTOs). The types should mirror the Rust domain models exactly.
- UI components should be strictly presentational. Delegate data fetching, caching, and persistence to the Rust backend.
- Handle different data statuses (`fresh`, `stale`, `error`) deliberately in the UI.

### Backend Guidelines (Rust)

- Ensure all Tauri command handlers return robust `Result<T, AppError>` types that serialize to JSON cleanly for the frontend to handle.
- Write structured logs for command executions and provider outcomes (e.g., time taken, endpoint hit), but strictly **redact any API keys**.

## 4. Expected Project Structure

When creating files, follow this established domain-driven structure:

```text
src/                          # React + TS frontend
  components/                 # Reusable UI components
  features/                   # Feature modules (watchlist/, chart/, settings/)
  services/                   # e.g., tauriClient.ts (Bridge wrappers)
  state/                      # Global state management
  types/                      # TS interfaces matching Rust models

src-tauri/src/                # Rust Native Backend
  commands/                   # Tauri command handlers (bootstrap, settings, watchlist)
  domain/                     # Normalized models (NormalizedQuote) and Errors (AppError)
  provider/                   # MarketDataProvider interface and TwelveDataAdapter
  persistence/                # Local stores (settings.json, cache/, watchlist.json)
  http/                       # Shared HTTP client logic
```

## 5. Testing and Commands

A `Makefile` is centrally located in the root directory. AI assistants should prefer these unified scripts:

- `make setup`: Initial installation
- `make dev`: Starts the Tauri + React dev application securely with PATH configured
- `make test`: Run all frontend and backend tests
- `make lint`: Run ESLint and cargo clippy
- `make format`: Run Prettier and cargo fmt

Production-readiness is a primary goal. New features should include:

- **Rust Unit Tests**: For provider parsing, error mapping, validation, and cache TTL logic.
- **TypeScript Unit Tests**: For local UI reducers, range selections, and chart data formatting.
- **Integration**: Ensure Tauri commands behave correctly under mocked HTTP conditions (especially rate-limit payloads).
