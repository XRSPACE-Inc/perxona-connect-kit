// Starts the sample's server.mjs for a test, pointed at the fake API from
// stub-upstream.mjs instead of the real one.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

const SAMPLE_DIR = path.resolve(import.meta.dirname, "../..");

// Fake keys. They only have to look different from each other.
export const SECRET_KEY = "pxc_test_secret_do_not_serve";
export const PUBLISHABLE_KEY = "pxc_test_publishable";

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function spawnSample(env) {
  const proc = spawn(process.execPath, ["server.mjs"], {
    cwd: SAMPLE_DIR,
    // Not inherited from your shell, so your own .env values cannot change
    // the result.
    env: { PATH: process.env.PATH, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  proc.stdout.on("data", (d) => (output += d));
  proc.stderr.on("data", (d) => (output += d));
  return { proc, output: () => output };
}

/** The environment a working local setup has, pointed at `upstreamUrl`. */
export function sampleEnv(upstreamUrl, overrides = {}) {
  return {
    PERXONA_API_BASE_URL: upstreamUrl,
    PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
    PERXONA_CONNECT_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    PRESENTER_URL: `${upstreamUrl}/presenter.js`,
    LLM_BASE_URL: `${upstreamUrl}/llm`,
    ...overrides,
  };
}

/**
 * Start server.mjs and wait until it answers.
 * @returns {Promise<{url: string, output: () => string, stop: () => void}>}
 */
export async function startServer(env) {
  const port = await freePort();
  const { proc, output } = spawnSample({ ...env, PORT: String(port) });
  const url = `http://127.0.0.1:${port}`;

  for (let i = 0; i < 50; i++) {
    if (proc.exitCode !== null) {
      throw new Error(`server.mjs exited with ${proc.exitCode}:\n${output()}`);
    }
    try {
      if ((await fetch(`${url}/api/health`)).ok) {
        return { url, output, stop: () => proc.kill() };
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  proc.kill();
  throw new Error(`server.mjs did not start:\n${output()}`);
}

/** Start server.mjs expecting it to refuse, and return how it exited. */
export async function startServerExpectingExit(env) {
  const { proc, output } = spawnSample({ ...env, PORT: String(await freePort()) });
  const timer = setTimeout(() => proc.kill(), 5000);
  const code = await new Promise((resolve) => proc.on("exit", resolve));
  clearTimeout(timer);
  return { code, output: output() };
}

/** Wait until `check()` stops throwing, for output that arrives a little later. */
export async function eventually(check, timeoutMs = 2000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      return check();
    } catch (err) {
      if (Date.now() > end) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
