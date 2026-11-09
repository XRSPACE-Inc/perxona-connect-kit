// Every route the sample serves still exists and answers with the shape the
// demos read.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sampleEnv, startServer } from "./helpers/start-server.mjs";
import { startStubUpstream } from "./helpers/stub-upstream.mjs";

let upstream;
let server;

before(async () => {
  upstream = await startStubUpstream();
  server = await startServer(sampleEnv(upstream.url));
});

after(async () => {
  server?.stop();
  await upstream?.close();
});

const get = (path) => fetch(`${server.url}${path}`);

describe("every route is still there", () => {
  // Add a line here when you add a route. A route that disappears answers 404.
  const routes = [
    ["GET", "/"],
    ["GET", "/api/health"],
    ["GET", "/api/config"],
    ["GET", "/api/connect-key"],
    ["GET", "/api/voices"],
    ["GET", "/api/credit"],
    ["GET", "/api/avatars"],
    ["GET", "/api/avatars/avatar-first"],
    ["GET", "/api/avatars/avatar-first/motions"],
    ["GET", "/api/scenes"],
    ["GET", "/api/scenes/scene-first"],
    ["GET", "/api/chatbots"],
    ["POST", "/api/chatbots"],
    ["GET", "/api/chatbots/bot-first"],
    ["PATCH", "/api/chatbots/bot-first"],
    ["DELETE", "/api/chatbots/bot-new-unused"],
    ["POST", "/api/chatbots/bot-first/knowledge"],
    ["DELETE", "/api/chatbots/bot-first/knowledge"],
    ["POST", "/api/chatbots/bot-first/chat"],
    ["POST", "/api/chat"],
  ];

  for (const [method, path] of routes) {
    it(`${method} ${path}`, async () => {
      const res = await fetch(`${server.url}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method === "POST" || method === "PATCH" ? { body: "{}" } : {}),
      });
      assert.notEqual(res.status, 404);
    });
  }
});

describe("health and config", () => {
  it("GET /api/health reports the API as reachable", async () => {
    const res = await get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok", upstream: "reachable" });
  });

  it("GET /api/config has every field the demos read", async () => {
    const res = await get("/api/config");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.mock, false);
    assert.equal(body.chat, false);
    assert.equal(typeof body.presenterUrl, "string");
    assert.equal(body.appManagedChatbotPrefix, "[app] ");
    assert.match(body.subscriptionUrl, /^https:\/\/console\.perxona\.ai\/(asia|eu)\//);
    assert.ok("fixedTarget" in body);
    assert.ok("chatbotId" in body);
  });

  it("GET /api/connect-key returns a key and tells the browser not to cache it", async () => {
    const res = await get("/api/connect-key");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await res.json();
    assert.equal(typeof body.connect_key, "string");
  });
});

describe("catalog", () => {
  it("GET /api/voices returns { items }", async () => {
    const body = await (await get("/api/voices")).json();
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items[0].id, "voice-first");
  });

  it("GET /api/avatars renames avatar_id to id", async () => {
    const body = await (await get("/api/avatars")).json();
    assert.equal(body.items[0].id, "avatar-first");
    assert.equal(body.items[0].avatar_id, undefined);
  });

  it("GET /api/scenes renames scene_id to id", async () => {
    const body = await (await get("/api/scenes")).json();
    assert.equal(body.items[0].id, "scene-first");
    assert.equal(body.items[0].scene_id, undefined);
  });

  it("GET /api/avatars/:id passes the detail through", async () => {
    const body = await (await get("/api/avatars/avatar-first")).json();
    assert.equal(body.avatar_id, "avatar-first");
  });

  it("GET /api/avatars/:id/motions returns { items }", async () => {
    const body = await (await get("/api/avatars/avatar-first/motions")).json();
    assert.equal(body.items[0].motion_id, "motion-1");
  });

  it("GET /api/scenes/:id passes the detail through", async () => {
    const body = await (await get("/api/scenes/scene-first")).json();
    assert.equal(body.scene_id, "scene-first");
  });

  it("GET /api/credit passes the usage through unchanged", async () => {
    const body = await (await get("/api/credit")).json();
    assert.deepEqual(body, { used_credit_points: 1, total_credit_points: 10 });
  });
});
