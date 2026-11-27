// Guards where the Express sample's secrets go. It lives outside the sample so
// that a change to what it checks needs a code owner's approval (see
// .github/CODEOWNERS), while server.mjs itself merges on green CI.
//
// It starts samples/express/server.mjs with fake keys against a fake Connect
// API, a fake presenter host and a fake LLM host, all on this machine, and
// checks that:
//   1. no secret appears in any response body or header, including when the
//      Connect API refuses a call, fails, or cannot be reached;
//   2. GET /api/connect-key returns the publishable key;
//   3. each secret is only sent to the host it belongs to: the Connect secret
//      key to PERXONA_API_BASE_URL, never to the presenter or LLM host, and
//      the LLM key to the LLM host;
//   4. the server refuses to start when a required setting is missing.
//
// It does not check response shapes or behaviour. Every route server.mjs
// declares as app.<method>("<path>") is found and called. Only the routes in
// REQUEST_BODIES get a request that works; any other route is still searched for
// secrets, but whatever else it answers is reported as a diagnostic, never as
// a failure, so adding a route does not block a pull request.
//
// It catches a change that leaks a secret by mistake, not one written to get
// past it: server.mjs is code from the pull request and can tell that it is
// running here. A green run does not replace reading the change to server.mjs.
//
// Not seen: a route declared another way (express.Router(), a computed path),
// a file under public/ that server.mjs writes, and a host written into
// server.mjs rather than read from its settings.
//
// Node built-ins only, and nothing imported from the sample, so a pull request
// cannot change what is checked here without touching this file.
//
// Run from the repository root, after `npm ci` in samples/express:
//   node --test .github/guards/*.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const SAMPLE_DIR = path.resolve(import.meta.dirname, "../../samples/express");

// Fake values only. They are long and distinctive so that a search through a
// response finds them, and shaped like no provider's key so that secret
// scanning does not flag this file.
const PUBLISHABLE_KEY = "guard-fake-publishable-key-not-a-real-key";

// Every secret the server holds, the setting it is read from, and the fake
// hosts it may be sent to. To guard another secret, add it here: checks 1 and
// 3 cover it, and check 4 covers it if it is also in REQUIRED_SETTINGS.
const SECRETS = [
  {
    setting: "PERXONA_CONNECT_SECRET_KEY",
    value: "guard-fake-connect-secret-key-must-never-leak",
    sentOnlyTo: ["connect"],
  },
  {
    setting: "LLM_API_KEY",
    value: "guard-fake-llm-key-must-never-leak",
    sentOnlyTo: ["llm"],
  },
];

// The settings server.mjs must refuse to start without.
const REQUIRED_SETTINGS = [
  "PERXONA_API_BASE_URL",
  "PERXONA_CONNECT_SECRET_KEY",
  "PERXONA_CONNECT_PUBLISHABLE_KEY",
];

const base64 = (text) => Buffer.from(text).toString("base64");

// The id every path parameter is filled with, and every fake item carries.
const FAKE_ID = "item-1";

// A request body for each route that gets past the route's own validation,
// keyed as server.mjs declares the route. A route missing here is called with
// an empty body.
const REQUEST_BODIES = {
  "POST /api/chatbots": { name: "Guard bot", custom_instructions: "x", tools: [] },
  "PATCH /api/chatbots/:id": { name: "Renamed" },
  "POST /api/chatbots/:id/knowledge": { filename: "a.txt", content_base64: base64("hi"), mime_type: "text/plain" },
  "POST /api/chatbots/:id/chat": { messages: [{ role: "user", parts: [{ type: "text", text: "Hi" }] }] },
  "POST /api/chat": { messages: [{ role: "user", content: "Hi" }] },
};
// Routes that need no body.
const NO_BODY_NEEDED = /^(GET|DELETE) /;

// How the fake hosts answer in each round; every route is called once a round. The error rounds are
// where a leak is most likely to hide: an error handler that dumps the request
// it made, or the headers it sent.
const ROUNDS = ["ok", 400, 401, 403, 500, "reset"];

// ── Fake hosts ──────────────────────────────────────────────────────────────

/**
 * An HTTP server on 127.0.0.1 that records every request and answers with
 * respond(req, pathname) → [status, body] in the "ok" round, and fails the
 * way currentRound.value says in any other.
 */
async function startFakeHost(name, respond, currentRound) {
  const requests = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const [pathname] = (req.url ?? "/").split("?");
      requests.push({
        host: name,
        method: req.method,
        url: req.url ?? "/",
        headers: req.headers,
        body: Buffer.concat(chunks).toString("latin1"),
      });
      if (currentRound.value === "reset") return req.socket.destroy();
      const [status, body] =
        currentRound.value === "ok"
          ? respond(req, pathname)
          : [currentRound.value, { code: 1002, details: "refused by the guard" }];
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function fakeConnectApi(req, pathname) {
  if (!pathname.includes("/api/v1/connect/")) return [200, { status: "ok" }];
  if (req.method === "DELETE") return [204];
  if (pathname.endsWith("/chat")) return [200, { id: "c", status: "success", reply_text: "hi" }];
  const item = { id: FAKE_ID, avatar_id: FAKE_ID, scene_id: FAKE_ID, name: "Item", status: "active" };
  if (req.method === "GET" && /\/(avatars|scenes|voices|chatbots|motions)$/.test(pathname))
    return [200, { items: [item], total: 1 }];
  return [200, item];
}

const fakePresenter = () => [200, {}];

const fakeLlm = () => [200, { choices: [{ message: { role: "assistant", content: "hi" } }] }];

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

/**
 * Only what the server needs, so nothing from the runner's environment, and
 * no .env (server.mjs is started without --env-file), reaches it. Every host
 * it calls is a fake one, so the guard never leaves this machine.
 */
function sampleEnv(hosts) {
  return {
    PATH: process.env.PATH,
    PERXONA_API_BASE_URL: `${hosts.connect}/asia`,
    PERXONA_CONNECT_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    ...Object.fromEntries(SECRETS.map(({ setting, value }) => [setting, value])),
    PRESENTER_URL: `${hosts.presenter}/presenter.js`,
    LLM_PROVIDER: "openai",
    LLM_BASE_URL: `${hosts.llm}/v1`,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Start server.mjs and wait until it answers. */
async function startSample(env) {
  const { proc, port, output } = await spawnSample(env);
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (proc.exitCode !== null) throw new Error(`server.mjs exited:\n${output()}`);
    try {
      await fetch(`${url}/`, { signal: AbortSignal.timeout(1000) });
      return { url, stop: () => proc.kill() };
    } catch {
      // Not listening yet.
    }
    await sleep(100);
  }
  proc.kill();
  throw new Error(`server.mjs did not start:\n${output()}`);
}

/** Start server.mjs expecting it to refuse, and return its exit code (null if it kept running). */
async function exitCodeOf(env) {
  const { proc } = await spawnSample(env);
  const timer = setTimeout(() => proc.kill(), 5000);
  const [code] = await new Promise((resolve) => proc.on("exit", (...args) => resolve(args)));
  clearTimeout(timer);
  return code;
}

// ── Routes ──────────────────────────────────────────────────────────────────

/** "METHOD /path" for every app.get/post/put/patch/delete/all("...") in server.mjs. */
async function declaredRoutes() {
  const source = await readFile(path.join(SAMPLE_DIR, "server.mjs"), "utf8");
  const found = source.matchAll(/\bapp\.(get|post|put|patch|delete|all)\(\s*["'`]([^"'`]+)["'`]/g);
  return [...new Set([...found].map(([, method, route]) => `${method === "all" ? "GET" : method.toUpperCase()} ${route}`))];
}

const fillPathParams = (route) => route.replace(/:[A-Za-z_]+/g, FAKE_ID);

/** Call each route once and keep everything it sent back, headers included. */
async function callRoutes(url, routes, round) {
  const results = [];
  for (const route of routes) {
    const [method, routePath] = route.split(" ");
    const body = REQUEST_BODIES[route] ?? (NO_BODY_NEEDED.test(route) ? undefined : {});
    try {
      const res = await fetch(`${url}${fillPathParams(routePath)}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      results.push({ route, round, status: res.status, headers: JSON.stringify([...res.headers]), text });
    } catch (err) {
      results.push({ route, round, status: `no response (${err.name})`, headers: "", text: "" });
    }
  }
  return results;
}

// ── Leak search ─────────────────────────────────────────────────────────────

/** The forms a secret is searched for in: as is, and base64-encoded. */
const formsOf = (secret) => [secret, base64(secret), base64(secret).replace(/=+$/, "")];

const contains = (text, secret) => formsOf(secret).some((form) => text.includes(form));

// ── Checks ──────────────────────────────────────────────────────────────────

describe("Express sample secrets guard", () => {
  const currentRound = { value: "ok" };
  const hosts = {};
  let declared;
  let sample;
  let responses = [];

  const allRequests = () => Object.values(hosts).flatMap((host) => host.requests);

  before(async () => {
    // Read before the sample starts, so that nothing it runs can change it.
    declared = await declaredRoutes();

    hosts.connect = await startFakeHost("connect", fakeConnectApi, currentRound);
    hosts.presenter = await startFakeHost("presenter", fakePresenter, currentRound);
    hosts.llm = await startFakeHost("llm", fakeLlm, currentRound);
    sample = await startSample(sampleEnv(Object.fromEntries(Object.entries(hosts).map(([k, h]) => [k, h.url]))));

    // The startup probe of the presenter host runs after the server listens.
    // Give it a moment, so a secret sent with it is seen.
    for (let i = 0; i < 30 && hosts.presenter.requests.length === 0; i++) await sleep(100);

    for (const round of ROUNDS) {
      currentRound.value = round;
      responses.push(...(await callRoutes(sample.url, declared, round)));
    }
    currentRound.value = "ok";
  });

  after(async () => {
    sample?.stop();
    await Promise.all(Object.values(hosts).map((host) => host.close()));
  });

  it("finds the routes server.mjs declares", (t) => {
    assert.ok(declared.length > 0, "no app.<method>(\"<path>\") found in server.mjs");
    // Diagnostics only: a route without a working request is still searched
    // for secrets, and must never block a pull request.
    for (const route of Object.keys(REQUEST_BODIES).filter((r) => !declared.includes(r)))
      t.diagnostic(`in REQUEST_BODIES but no longer in server.mjs: ${route}`);
    for (const r of responses.filter((r) => r.round === "ok" && !(Number(r.status) < 400)))
      t.diagnostic(`answered ${r.status} with the fake hosts up (not a failure): ${r.route}`);
  });

  it("sees each secret reach its own host, so the checks below are not blind", () => {
    for (const { setting, value, sentOnlyTo } of SECRETS) {
      const seen = allRequests().filter((r) => sentOnlyTo.includes(r.host) && contains(JSON.stringify(r), value));
      assert.ok(
        seen.length > 0,
        `${setting} was never sent to the ${sentOnlyTo.join(" or ")} host. The guard's request or settings ` +
          "no longer match server.mjs; ask a code owner to update .github/guards/ in this pull request.",
      );
    }
  });

  it("never puts a secret in a response body or header", () => {
    const leaks = responses.flatMap((r) =>
      SECRETS.filter(({ value }) => contains(r.headers + r.text, value)).map(
        ({ setting }) => `${setting} in ${r.route} (fake hosts: ${r.round}, answered ${r.status})`,
      ),
    );
    assert.deepEqual(leaks, []);
  });

  it("returns the publishable key on GET /api/connect-key", () => {
    const connectKeyResponse = responses.find((r) => r.route === "GET /api/connect-key" && r.round === "ok");
    assert.ok(connectKeyResponse, "GET /api/connect-key is no longer declared in server.mjs");
    assert.equal(connectKeyResponse.status, 200);
    assert.equal(JSON.parse(connectKeyResponse.text).connect_key, PUBLISHABLE_KEY);
  });

  it("sends each secret only to the host it belongs to", () => {
    const leaks = allRequests().flatMap((r) =>
      SECRETS.filter(({ value, sentOnlyTo }) => !sentOnlyTo.includes(r.host) && contains(JSON.stringify(r), value)).map(
        ({ setting }) => `${setting} sent to the ${r.host} host: ${r.method} ${r.url}`,
      ),
    );
    assert.deepEqual(leaks, []);
  });
});

describe("Express sample refuses to start without its settings", () => {
  // Nothing listens on port 9; the server must stop before it calls anything.
  const env = sampleEnv({ connect: "http://127.0.0.1:9", presenter: "http://127.0.0.1:9", llm: "http://127.0.0.1:9" });
  for (const setting of REQUIRED_SETTINGS) {
    for (const [how, value] of [["unset", undefined], ["empty", ""]]) {
      it(`${setting} ${how}`, async () => {
        const without = { ...env, [setting]: value };
        if (value === undefined) delete without[setting];
        const code = await exitCodeOf(without);
        assert.notEqual(code, null, "server.mjs kept running instead of exiting");
        assert.notEqual(code, 0);
      });
    }
  }
});
