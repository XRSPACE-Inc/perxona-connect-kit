// Who may change data. One describe per row of the table in README
// "Deploy to Vercel": running locally, and deployed with the admin token, as
// any other visitor, and with no token configured.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  deployedEnv,
  sampleEnv,
  startServer,
} from "./helpers/start-server.mjs";
import { startStubUpstream } from "./helpers/stub-upstream.mjs";

const ADMIN_TOKEN = "test-admin-token-never-in-a-response";

const base64 = (text) => Buffer.from(text).toString("base64");
const hello = [{ role: "user", parts: [{ type: "text", text: "Hello" }] }];
const knowledgeFile = {
  filename: "notes.txt",
  content_base64: base64("hello"),
  mime_type: "text/plain",
};

// Every route that changes data, each built fresh so a DELETE never runs
// against a chatbot an earlier request already removed.
const WRITES = [
  ["POST", "/api/chatbots", { name: "Test Bot" }],
  ["PATCH", "/api/chatbots/bot-first", { name: "Renamed" }],
  ["DELETE", "/api/chatbots/bot-second"],
  ["POST", "/api/chatbots/bot-first/knowledge", knowledgeFile],
  ["DELETE", "/api/chatbots/bot-first/knowledge"],
];

const READS = [
  "/api/config",
  "/api/avatars",
  "/api/scenes",
  "/api/voices",
  "/api/credit",
  "/api/chatbots",
  "/api/chatbots/bot-first",
];

/**
 * Start the stub and the server; returns a `send` that records every
 * response, so a test can check none of them carried the token.
 */
function setup(env) {
  const ctx = { responses: [] };
  before(async () => {
    ctx.upstream = await startStubUpstream();
    ctx.server = await startServer(env(ctx.upstream.url));
  });
  after(async () => {
    ctx.server?.stop();
    await ctx.upstream?.close();
  });
  ctx.send = async (method, path, body, headers = {}) => {
    const res = await fetch(`${ctx.server.url}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    ctx.responses.push({ headers: [...res.headers].flat().join("\n"), text });
    return { status: res.status, headers: res.headers, text, json: () => JSON.parse(text) };
  };
  ctx.upstreamWrites = () =>
    ctx.upstream.requests.filter(
      ({ method, path }) =>
        method !== "GET" && !path.endsWith("/chat") && path.startsWith("/api/v1/connect/chatbots"),
    );
  return ctx;
}

function readsAndChatStayPublic(ctx) {
  for (const path of READS) {
    it(`GET ${path} needs no token`, async () => {
      assert.equal((await ctx.send("GET", path)).status, 200);
    });
  }
  it("POST /api/chatbots/:id/chat needs no token", async () => {
    const res = await ctx.send("POST", "/api/chatbots/bot-first/chat", { messages: hello });
    assert.equal(res.status, 200);
  });
}

describe("running locally", () => {
  const ctx = setup((url) => sampleEnv(url));

  for (const [method, path, body] of WRITES) {
    it(`${method} ${path} works without a token, as before`, async () => {
      const res = await ctx.send(method, path, body);
      assert.ok(res.status < 300, `${res.status}: ${res.text}`);
    });
  }

  it("has no admin sign-in route", async () => {
    assert.equal((await ctx.send("POST", "/api/admin/session", { token: "x" })).status, 404);
  });

  readsAndChatStayPublic(ctx);
});

describe("deployed, owner with the token", () => {
  const ctx = setup((url) => deployedEnv(url, { ADMIN_TOKEN }));
  let cookie;

  it("refuses a wrong token with 403", async () => {
    const res = await ctx.send("POST", "/api/admin/session", { token: "wrong" });
    assert.equal(res.status, 403);
    assert.equal(res.json().code, "admin_token_invalid");
    assert.equal(res.headers.get("set-cookie"), null);
  });

  it("refuses a token that is not text with 403", async () => {
    const res = await ctx.send("POST", "/api/admin/session", { token: ["x"] });
    assert.equal(res.status, 403);
  });

  it("answers the right token with an HttpOnly, Secure, SameSite=Strict cookie", async () => {
    const res = await ctx.send("POST", "/api/admin/session", { token: ADMIN_TOKEN });
    assert.equal(res.status, 204);
    const setCookie = res.headers.get("set-cookie");
    assert.match(setCookie, /^__Host-admin_session=[0-9a-f]{64};/);
    assert.match(setCookie, /; HttpOnly(;|$)/);
    assert.match(setCookie, /; Secure(;|$)/);
    assert.match(setCookie, /; SameSite=Strict(;|$)/);
    assert.match(setCookie, /; Path=\/(;|$)/);
    cookie = setCookie.split(";")[0];
  });

  for (const [method, path, body] of WRITES) {
    it(`${method} ${path} works with the cookie`, async () => {
      const res = await ctx.send(method, path, body, { Cookie: `other=1; ${cookie}` });
      assert.ok(res.status < 300, `${res.status}: ${res.text}`);
    });
  }

  readsAndChatStayPublic(ctx);

  it("never sends the token back, in a body or a header", () => {
    for (const { headers, text } of ctx.responses) {
      assert.ok(!headers.includes(ADMIN_TOKEN));
      assert.ok(!text.includes(ADMIN_TOKEN));
    }
  });
});

describe("deployed, any other visitor", () => {
  const ctx = setup((url) => deployedEnv(url, { ADMIN_TOKEN }));

  for (const [method, path, body] of WRITES) {
    it(`${method} ${path} is refused with 403 and never reaches upstream`, async () => {
      const res = await ctx.send(method, path, body);
      assert.equal(res.status, 403);
      assert.equal(res.json().code, "admin_token_required");
      assert.deepEqual(ctx.upstreamWrites(), []);
    });
  }

  it("is refused with a cookie that is not the server's", async () => {
    const res = await ctx.send("POST", "/api/chatbots", { name: "x" }, {
      Cookie: `__Host-admin_session=${"0".repeat(64)}`,
    });
    assert.equal(res.status, 403);
  });

  it("is refused with the token itself as the cookie", async () => {
    const res = await ctx.send("POST", "/api/chatbots", { name: "x" }, {
      Cookie: `__Host-admin_session=${ADMIN_TOKEN}`,
    });
    assert.equal(res.status, 403);
    assert.deepEqual(ctx.upstreamWrites(), []);
  });

  readsAndChatStayPublic(ctx);
});

describe("deployed, no token configured", () => {
  const ctx = setup((url) => deployedEnv(url));

  for (const [method, path, body] of WRITES) {
    it(`${method} ${path} is refused with 403 naming ADMIN_TOKEN`, async () => {
      const res = await ctx.send(method, path, body);
      assert.equal(res.status, 403);
      const { code, error } = res.json();
      assert.equal(code, "admin_token_not_set");
      assert.match(error, /ADMIN_TOKEN/);
      assert.deepEqual(ctx.upstreamWrites(), []);
    });
  }

  it("signing in is refused with the same message", async () => {
    const res = await ctx.send("POST", "/api/admin/session", { token: "" });
    assert.equal(res.status, 403);
    assert.equal(res.json().code, "admin_token_not_set");
  });

  readsAndChatStayPublic(ctx);
});
