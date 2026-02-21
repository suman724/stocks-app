# Stocks Desktop App

A cross-platform desktop application built with Tauri v2, React, and TypeScript to track stock performance.

## Overview

This application provides a clean, fast interface for tracking a watchlist of stock symbols, viewing current quotes, and analyzing historical performance through interactive charts. It leverages the Twelve Data free tier API for market data.

The project is architected with a strict separation of concerns to ensure security, resilience, and testability.

## Architecture

*   **Frontend**: React + TypeScript. Responsible solely for presentation and UI state.
*   **Backend**: Tauri v2 + Rust. Handles all network requests, local persistence, and caching.
*   **Data Flow**: The React frontend *never* makes direct HTTP requests to the market data provider. All actions (fetching quotes, getting chart data, saving settings) are routed through secure Tauri command invocations to the Rust backend.
*   **Resilience**: The backend aggressively caches market data to stay within free-tier limits and provides graceful degradation (serving stale data) if network requests fail.

## Prerequisites

*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust](https://www.rust-lang.org/tools/install) (1.70+)
*   Tauri prerequisites for your OS (see [Tauri Documentation](https://v2.tauri.app/start/prerequisites/))

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd stocks-app
    ```

2.  **Install dependencies and setup:**
    ```bash
    make setup
    ```

3.  **Run in Development Mode:**
    ```bash
    make dev
    ```

## Makefile Commands

A `Makefile` is provided for common development tasks:

*   `make dev`: Run the Tauri app in development mode
*   `make build`: Build the production binaries
*   `make test`: Run all frontend and backend tests
*   `make lint`: Run ESLint and cargo clippy
*   `make format`: Run Prettier and cargo fmt

## Project Structure

*   `/src`: React + TypeScript frontend codebase.
*   `/src-tauri`: Rust backend codebase (Tauri commands, market data adapter, local storage).
*   `/architecture/architecture.md`: Detailed architectural specification.
*   `/AGENTS.md`: Strict rules and conventions for AI coding agents working on this repo.

## Configuration

To use the app, you will need a free API key from [Twelve Data](https://twelvedata.com/). This key is entered securely within the application's UI settings screen and saved locally by the Rust backend.

## Roadmap & Implementation Phases

The development of this app is organized into phases:

*   **Phase 0:** Scaffolding (Tauri + React setup)
*   **Phase 1:** Settings, Persistence, and API Key Flow
*   **Phase 2:** Quote Summary Watchlist (MVP Core)
*   **Phase 3:** Historical Performance Chart
*   **Phase 4/5:** E2E Tests, Packaging, and Polish
