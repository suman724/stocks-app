import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const e2eRoot = path.resolve(__dirname, '..');

function resolveDriverBinary() {
  if (process.env.TAURI_DRIVER_PATH) {
    return process.env.TAURI_DRIVER_PATH;
  }

  const driverName = process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver';
  const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), '.cargo');
  const candidate = path.join(cargoHome, 'bin', driverName);

  return existsSync(candidate) ? candidate : driverName;
}

function assertDriverSupport(driverBinary) {
  const probe = spawnSync(driverBinary, ['--help'], {
    cwd: e2eRoot,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  if (probe.error) {
    throw new Error(
      `[e2e] Unable to execute '${driverBinary}' (${probe.error.message}). Install with 'cargo install tauri-driver --locked' or set TAURI_DRIVER_PATH.`
    );
  }

  const output = `${probe.stdout || ''}\n${probe.stderr || ''}`.toLowerCase();
  if (output.includes('not supported on this platform')) {
    throw new Error(
      `[e2e] '${driverBinary}' is not supported on ${process.platform}. Desktop WebDriver smoke tests with tauri-driver cannot run on this host. Run these smoke tests on Windows/Linux.`
    );
  }
}

function resolveNativeDriverPath() {
  if (process.env.TAURI_NATIVE_DRIVER_PATH) {
    return process.env.TAURI_NATIVE_DRIVER_PATH;
  }

  if (process.platform !== 'linux') {
    return undefined;
  }

  const probe = spawnSync('which', ['WebKitWebDriver'], {
    cwd: e2eRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (probe.status === 0) {
    return probe.stdout.trim();
  }

  return undefined;
}

function main() {
  const driverBinary = resolveDriverBinary();
  assertDriverSupport(driverBinary);
  const nativeDriverPath = resolveNativeDriverPath();

  if (process.platform === 'linux' && !nativeDriverPath) {
    throw new Error(
      "[e2e] WebKitWebDriver not found on Linux. Install 'webkit2gtk-driver' or set TAURI_NATIVE_DRIVER_PATH."
    );
  }

  const run = spawnSync('wdio', ['run', './wdio.conf.mjs'], {
    cwd: e2eRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      TAURI_DRIVER_PATH: process.env.TAURI_DRIVER_PATH || driverBinary,
      ...(nativeDriverPath ? { TAURI_NATIVE_DRIVER_PATH: nativeDriverPath } : {}),
    },
  });

  if (typeof run.status === 'number') {
    process.exit(run.status);
  }
  process.exit(1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
