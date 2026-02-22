# Desktop E2E Harness

This directory contains automated desktop smoke tests that run against the compiled Tauri app using WebDriver and `tauri-driver`.
The smoke command runs a preflight wrapper first and only starts WDIO when the platform/driver are supported.

## Prerequisites

1. Install the test dependencies:
   - `npm --prefix e2e install`
2. Install `tauri-driver`:
   - `cargo install tauri-driver --locked`
3. Ensure Rust and Node prerequisites for Tauri are already installed.

## Run Smoke Tests

From the repository root:

```bash
make e2e-smoke
```

This will:

1. Build the app in debug mode (`tauri build --debug --no-bundle`)
2. Start `tauri-driver` on port `4444`
3. Execute smoke specs in `e2e/specs`

## Useful Overrides

- `E2E_SKIP_BUILD=1 make e2e-smoke`
  - Use an existing binary and skip rebuild.
- `E2E_APP_PATH=src-tauri/target/debug/tauri-stocks-app make e2e-smoke`
  - Override which app binary path is used.
- `TAURI_DRIVER_PATH=/custom/path/to/tauri-driver make e2e-smoke`
  - Override the driver binary path.

## Notes

- The harness targets `src-tauri/target/debug/tauri-stocks-app(.exe)` by default.
- Official `tauri-driver` support is limited on macOS. If app startup fails there, run smoke tests on Windows/Linux or switch to a macOS-capable driver setup.
- CI automation is wired in `.github/workflows/ci.yml` as job `desktop-e2e-smoke-linux`.

## Common Failure: `spawn tauri-driver ENOENT`

If you see this, `tauri-driver` is not installed or not discoverable.

1. Install it:
   - `cargo install tauri-driver --locked`
2. Ensure Cargo bin is on PATH:
   - `export PATH="$HOME/.cargo/bin:$PATH"`
3. Or point the harness directly:
   - `TAURI_DRIVER_PATH=$HOME/.cargo/bin/tauri-driver make e2e-smoke`

## Common Failure: `tauri-driver is not supported on this platform`

If you see this on macOS, the current `tauri-driver` build does not support desktop WebDriver sessions on your host.

- Run the desktop smoke suite on a Windows/Linux machine.
- Keep macOS validation in the manual smoke checklist until we add an alternative macOS-capable E2E path.
