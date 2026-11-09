// Checks on the Express sample that live outside it: changes to this folder
// need a code owner's approval (see .github/CODEOWNERS), while
// samples/express/tests/ merges on green like any other file.
//
// It starts samples/express/server.mjs against a fake Connect API on this
// machine and checks that:
//   - the secret key never reaches a browser, in any response;
//   - every Connect API call carries the secret key, and only that;
//   - every Connect API call is in the pinned contract, openapi.pinned.yaml;
//   - the server refuses to start without its keys.
//
// Node built-ins only, and nothing imported from the sample's own tests, so
// changing those cannot change what is checked here.
//
// Every route declared in server.mjs is called and its response searched for
// the secret key. Only the routes in ROUTES are called with a request body
// that reaches the Connect API; a new route gets that part of the check once
// a code owner adds it to ROUTES. Calls to a host written into server.mjs
// rather than read from its settings are not seen here.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const SAMPLE_DIR = path.resolve(import.meta.dirname, "../../samples/express");
const CONTRACT = path.join(import.meta.dirname, "openapi.pinned.yaml");

// Distinctive, so a search through any response finds it if it leaks.
const SECRET_KEY = "pxc_guard_secret_7f3c9a1e_must_not_leak";
const PUBLISHABLE_KEY = "pxc_guard_publishable_2b8d";

// Calls outside the contract that the sample is allowed to make.
const ALLOWED_OUTSIDE_CONTRACT = ["GET /ready"];
// The fake presenter engine and LLM provider, which are not the Connect API.
const NOT_CONNECT_API = [/^\/presenter\.js$/, /^\/llm\//];

const base64 = (text) => Buffer.from(text).toString("base64");
const chatMessages = [{ role: "user", parts: [{ type: "text", text: "Hi" }] }];

// Every route as server.mjs declares it, with a body valid enough to reach
// the Connect API. Path parameters are filled with "item-1".
const ROUTES = [
  ["GET", "/"],
  ["GET", "/api/health"],
  ["GET", "/api/config"],
  ["GET", "/api/connect-key"],
  ["GET", "/api/voices"],
  ["GET", "/api/credit"],
  ["GET", "/api/avatars"],
  ["GET", "/api/avatars/:id"],
  ["GET", "/api/avatars/:id/motions"],
  ["GET", "/api/scenes"],
  ["GET", "/api/scenes/:id"],
  ["GET", "/api/chatbots"],
  ["POST", "/api/chatbots", { name: "Guard bot", custom_instructions: "x", tools: [] }],
  ["GET", "/api/chatbots/:id"],
  ["PATCH", "/api/chatbots/:id", { name: "Renamed" }],
  ["POST", "/api/chatbots/:id/knowledge", { filename: "a.txt", content_base64: base64("hi"), mime_type: "text/plain" }],
  ["DELETE", "/api/chatbots/:id/knowledge"],
  ["POST", "/api/chatbots/:id/chat", { messages: chatMessages }],
  ["DELETE", "/api/chatbots/:id"],
  ["POST", "/api/chat", { messages: [{ role: "user", content: "hi" }] }],
];

// Routes that answer without calling the Connect API. /api/config resolves
// its target at startup, so a request to it may not call out either.
const NO_CONNECT_CALL = ["GET /", "GET /api/health", "GET /api/config", "GET /api/connect-key", "POST /api/chat"];

// ── Fake Connect API ────────────────────────────────────────────────────────

async function startFakeApi() {
  const requests = [];
  let refuseWith = null;
  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const [pathname] = (req.url ?? "/").split("?");
      requests.push({
        method: req.method,
        path: pathname,
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      const send = (status, body) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(body === undefined ? undefined : JSON.stringify(body));
      };
      if (!pathname.startsWith("/api/v1/connect/")) return send(200, { status: "ok" });
      if (refuseWith) return send(refuseWith, { code: 1002, details: "refused" });
      if (req.method === "DELETE") return send(204);
      if (pathname.endsWith("/chat")) return send(200, { id: "c", status: "success", reply_text: "hi" });
      const item = { id: "item-1", avatar_id: "item-1", scene_id: "item-1", name: "Item", status: "active" };
      if (req.method === "GET" && /\/(avatars|scenes|voices|chatbots|motions)$/.test(pathname))
        return send(200, { items: [item], total: 1 });
      send(200, item);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    refuse: (status) => (refuseWith = status),
    stopRefusing: () => (refuseWith = null),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// ── Sample server ───────────────────────────────────────────────────────────

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function sampleEnv(apiUrl, overrides = {}) {
  return {
    PATH: process.env.PATH,
    PERXONA_API_BASE_URL: apiUrl,
    PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
    PERXONA_CONNECT_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    // Everything else the server would call points at the fake too, so the
    // check never leaves this machine.
    PRESENTER_URL: `${apiUrl}/presenter.js`,
    LLM_API_KEY: "fake-llm-key",
    LLM_BASE_URL: `${apiUrl}/llm`,
    ...overrides,
  };
}

async function spawnSample(env) {
  const port = await freePort();
  const proc = spawn(process.execPath, ["server.mjs"], {
    cwd: SAMPLE_DIR,
    env: { ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  proc.stdout.on("data", (d) => (output += d));
  proc.stderr.on("data", (d) => (output += d));
  return { proc, port, output: () => output };
}

/** Start server.mjs and wait until it answers. */
async function startSample(env) {
  const { proc, port, output } = await spawnSample(env);
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    if (proc.exitCode !== null) throw new Error(`server.mjs exited:\n${output()}`);
    try {
      if ((await fetch(`${url}/api/health`)).ok) return { url, stop: () => proc.kill() };
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  proc.kill();
  throw new Error(`server.mjs did not start:\n${output()}`);
}

/** Start server.mjs expecting it to refuse, and return its exit code. */
async function startSampleExpectingExit(env) {
  const { proc } = await spawnSample(env);
  const timer = setTimeout(() => proc.kill(), 5000);
  const code = await new Promise((resolve) => proc.on("exit", resolve));
  clearTimeout(timer);
  return code;
}

// ── Routes ──────────────────────────────────────────────────────────────────

/** "METHOD /path" for every app.get/post/put/patch/delete(...) in server.mjs. */
async function declaredRoutes() {
  const source = await readFile(path.join(SAMPLE_DIR, "server.mjs"), "utf8");
  const found = source.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g);
  return [...new Set([...found].map(([, method, route]) => `${method.toUpperCase()} ${route}`))];
}

const fill = (route) => route.replace(/:[A-Za-z_]+/g, "item-1");

async function callRoutes(url, routes, apiRequests) {
  const results = [];
  for (const [method, route, body] of routes) {
    const before = apiRequests.filter((r) => r.path.startsWith("/api/v1/connect/")).length;
    const res = await fetch(`${url}${fill(route)}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body || method === "POST" || method === "PATCH" ? { body: JSON.stringify(body ?? {}) } : {}),
    });
    const text = JSON.stringify([...res.headers]) + (await res.text());
    const connectCalls = apiRequests.filter((r) => r.path.startsWith("/api/v1/connect/")).length - before;
    results.push({ route: `${method} ${route}`, status: res.status, text, connectCalls });
  }
  return results;
}

// ── Contract ────────────────────────────────────────────────────────────────

/** Read "METHOD /path" pairs from an OpenAPI file, with {params} as patterns. */
async function readContract() {
  const lines = (await readFile(CONTRACT, "utf8")).split("\n");
  const operations = [];
  let inPaths = false;
  let current = null;
  for (const line of lines) {
    if (/^\S/.test(line)) inPaths = line.startsWith("paths:");
    if (!inPaths) continue;
    const pathLine = line.match(/^ {2}(\/\S*):\s*$/);
    if (pathLine) current = pathLine[1];
    const methodLine = line.match(/^ {4}(get|put|post|patch|delete|head|options):\s*$/);
    if (methodLine && current) {
      const pattern = new RegExp(`^${current.replace(/\{[^}]+\}/g, "[^/]+")}$`);
      operations.push({ method: methodLine[1].toUpperCase(), pattern });
    }
  }
  return operations;
}

// ── Checks ──────────────────────────────────────────────────────────────────

describe("Express sample guard", () => {
  let api;
  let sample;
  let declared;
  let listed;
  let unlisted;
  let firstRound;
  let refusedRound;

  before(async () => {
    declared = await declaredRoutes();
    const listedNames = ROUTES.map(([method, route]) => `${method} ${route}`);
    unlisted = declared.filter((r) => !listedNames.includes(r)).map((r) => r.split(" "));

    api = await startFakeApi();
    sample = await startSample(sampleEnv(api.url));
    listed = await callRoutes(sample.url, ROUTES, api.requests);
    const extra = await callRoutes(sample.url, unlisted, api.requests);
    firstRound = [...listed, ...extra];
    // Error paths too: a refusal is where a leak would most likely hide.
    api.refuse(403);
    refusedRound = await callRoutes(sample.url, [...ROUTES, ...unlisted], api.requests);
    api.stopRefusing();
  });

  after(async () => {
    sample?.stop();
    await api?.close();
  });

  const connectCalls = () => api.requests.filter((r) => r.path.startsWith("/api/v1/connect/"));

  it("still finds every listed route in server.mjs", () => {
    // If this fails, either a route was removed or renamed, or server.mjs now
    // declares routes in a way the scan in declaredRoutes() cannot read.
    const missing = ROUTES.map(([m, r]) => `${m} ${r}`).filter((r) => !declared.includes(r));
    assert.deepEqual(missing, [], "listed routes not found in server.mjs");
  });

  it("reaches the Connect API through every listed route", () => {
    const failing = listed
      .filter((r) => r.status >= 400 || (!NO_CONNECT_CALL.includes(r.route) && r.connectCalls === 0))
      .map((r) => `${r.route} → ${r.status}, ${r.connectCalls} Connect API call(s)`);
    assert.deepEqual(failing, [], "update the request body for these routes in ROUTES");
  });

  it("names the routes this guard has no request body for", (t) => {
    for (const [method, route] of unlisted) t.diagnostic(`not in ROUTES yet: ${method} ${route}`);
  });

  it("never puts the secret key in a response", () => {
    const leaks = [...firstRound, ...refusedRound].filter((r) => r.text.includes(SECRET_KEY)).map((r) => r.route);
    assert.deepEqual(leaks, []);
  });

  it("hands the browser the publishable key", async () => {
    const body = await (await fetch(`${sample.url}/api/connect-key`)).json();
    assert.equal(body.connect_key, PUBLISHABLE_KEY);
  });

  it("sends the secret key, and nothing else, on every Connect API call", () => {
    assert.ok(connectCalls().length > 0, "no Connect API call was made");
    for (const call of connectCalls()) {
      const where = `${call.method} ${call.path}`;
      assert.equal(call.headers["x-connect-key"], SECRET_KEY, where);
      assert.equal(call.headers.authorization, undefined, where);
    }
  });

  it("never sends the secret key to the other services it is configured to call", () => {
    const others = api.requests.filter((r) => !r.path.startsWith("/api/v1/connect/"));
    const leaks = others.filter((r) => JSON.stringify(r.headers).includes(SECRET_KEY) || r.body.includes(SECRET_KEY));
    assert.deepEqual(
      leaks.map((r) => `${r.method} ${r.path}`),
      [],
    );
  });

  it("only calls what the pinned contract lists", async () => {
    const operations = await readContract();
    assert.ok(operations.length > 0, "openapi.pinned.yaml lists no operations");
    const unknown = new Set();
    for (const { method, path: callPath } of api.requests) {
      if (NOT_CONNECT_API.some((pattern) => pattern.test(callPath))) continue;
      const call = `${method} ${callPath}`;
      if (ALLOWED_OUTSIDE_CONTRACT.includes(call)) continue;
      if (!operations.some((op) => op.method === method && op.pattern.test(callPath))) unknown.add(call);
    }
    assert.deepEqual([...unknown], [], "calls missing from .github/guards/openapi.pinned.yaml");
  });
});

describe("Express sample refuses to start without its settings", () => {
  // Nothing listens here; the server must stop before it tries.
  const UNREACHABLE_API_URL = "http://127.0.0.1:9";
  const cases = {
    "no secret key": { PERXONA_CONNECT_SECRET_KEY: "" },
    "no publishable key": { PERXONA_CONNECT_PUBLISHABLE_KEY: "" },
    "no API base URL": { PERXONA_API_BASE_URL: "" },
  };
  for (const [name, overrides] of Object.entries(cases)) {
    it(name, async () => {
      const code = await startSampleExpectingExit(sampleEnv(UNREACHABLE_API_URL, overrides));
      assert.notEqual(code, null, "server.mjs kept running instead of exiting");
      assert.notEqual(code, 0);
    });
  }
});
