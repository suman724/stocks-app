import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let tauriDriverProcess;

function ensureTauriDriverAvailable(driverBinary) {
  const check = spawnSync(driverBinary, ['--help'], {
    cwd: projectRoot,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  if (check.error) {
    const installHelp =
      "Install it with 'cargo install tauri-driver --locked' or set TAURI_DRIVER_PATH to the binary.";
    throw new Error(
      `[e2e] Unable to execute '${driverBinary}' (${check.error.message}). ${installHelp}`
    );
  }

  const output = `${check.stdout || ''}\n${check.stderr || ''}`.toLowerCase();
  if (output.includes('not supported on this platform')) {
    throw new Error(
      `[e2e] '${driverBinary}' is not supported on ${process.platform}. Desktop WebDriver smoke tests with tauri-driver cannot run on this host. Run these smoke tests on Windows/Linux, then we can wire CI accordingly.`
    );
  }
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDriverStartup(processHandle, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(
        `[e2e] tauri-driver exited early with code ${processHandle.exitCode}.`
      );
    }
    if (await isPortOpen(port)) {
      return;
    }
    await sleep(150);
  }
  throw new Error(
    `[e2e] tauri-driver did not open port ${port} within ${timeoutMs}ms.`
  );
}

function resolveAppPath() {
  const appPathFromEnv = process.env.E2E_APP_PATH;
  if (appPathFromEnv) {
    return path.resolve(projectRoot, appPathFromEnv);
  }

  const binaryName = process.platform === 'win32' ? 'tauri-stocks-app.exe' : 'tauri-stocks-app';
  return path.join(projectRoot, 'src-tauri', 'target', 'debug', binaryName);
}

function resolveTauriDriverBinary() {
  if (process.env.TAURI_DRIVER_PATH) {
    return process.env.TAURI_DRIVER_PATH;
  }

  const driverName = process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver';
  const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), '.cargo');
  const candidate = path.join(cargoHome, 'bin', driverName);
  return existsSync(candidate) ? candidate : driverName;
}

function resolveNativeDriverPath() {
  if (process.env.TAURI_NATIVE_DRIVER_PATH) {
    return process.env.TAURI_NATIVE_DRIVER_PATH;
  }

  if (process.platform !== 'linux') {
    return null;
  }

  const probe = spawnSync('which', ['WebKitWebDriver'], {
    cwd: projectRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (probe.status === 0) {
    return probe.stdout.trim();
  }

  return null;
}

function stopTauriDriver() {
  if (!tauriDriverProcess || tauriDriverProcess.killed) {
    return;
  }
  tauriDriverProcess.kill('SIGTERM');
  tauriDriverProcess = undefined;
}

export const config = {
  runner: 'local',
  specs: ['./specs/**/*.e2e.mjs'],
  maxInstances: 1,
  logLevel: process.env.WDIO_LOG_LEVEL || 'error',
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },
  hostname: '127.0.0.1',
  port: 4444,
  path: '/',
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: resolveAppPath(),
      },
    },
  ],
  onPrepare() {
    if (process.platform === 'darwin') {
      console.warn(
        '[e2e] Official tauri-driver support is limited on macOS. If startup fails, run on Windows/Linux or use a macOS-capable driver setup.'
      );
    }

    if (process.env.E2E_SKIP_BUILD === '1') {
      console.log('[e2e] Skipping app build because E2E_SKIP_BUILD=1.');
      return;
    }

    const buildResult = spawnSync(
      'npm',
      ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'],
      {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      }
    );

    if (buildResult.status !== 0) {
      throw new Error(`[e2e] Failed to build desktop app for smoke tests (exit ${buildResult.status}).`);
    }
  },
  async beforeSession() {
    const appPath = resolveAppPath();
    if (!existsSync(appPath)) {
      throw new Error(
        `[e2e] App binary not found at ${appPath}. Run with E2E_SKIP_BUILD=0 or provide E2E_APP_PATH.`
      );
    }

    const driverBinary = resolveTauriDriverBinary();
    ensureTauriDriverAvailable(driverBinary);
    const nativeDriverPath = resolveNativeDriverPath();
    if (process.platform === 'linux' && !nativeDriverPath) {
      throw new Error(
        "[e2e] WebKitWebDriver was not found. Install package 'webkit2gtk-driver' or set TAURI_NATIVE_DRIVER_PATH to the WebKitWebDriver binary."
      );
    }

    const tauriDriverArgs = ['--port', '4444'];
    if (nativeDriverPath) {
      tauriDriverArgs.push('--native-driver', nativeDriverPath);
    }

    let startError;

    tauriDriverProcess = spawn(driverBinary, tauriDriverArgs, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        RUST_LOG: process.env.RUST_LOG || 'warn',
      },
    });

    tauriDriverProcess.once('error', (err) => {
      startError = err;
    });

    await sleep(100);
    if (startError) {
      throw new Error(
        `[e2e] Failed to start tauri-driver: ${startError.message}. Verify TAURI_DRIVER_PATH or install via 'cargo install tauri-driver --locked'.`
      );
    }

    await waitForDriverStartup(tauriDriverProcess, 4444, 10_000);
  },
  afterSession() {
    stopTauriDriver();
  },
  onComplete() {
    stopTauriDriver();
  },
};
