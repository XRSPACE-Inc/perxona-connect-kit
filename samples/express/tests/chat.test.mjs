// POST /api/chat, the route that talks to your own LLM key.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eventually, sampleEnv, startServer } from "./helpers/start-server.mjs";
import { startStubUpstream } from "./helpers/stub-upstream.mjs";

let upstream;
let withoutKey;
let withKey;

before(async () => {
  upstream = await startStubUpstream();
  withoutKey = await startServer(sampleEnv(upstream.url));
  // The fake LLM always answers 503, so a request that gets past the size
  // limits ends in 502 rather than 400.
  withKey = await startServer(sampleEnv(upstream.url, { LLM_API_KEY: "fake-llm-key" }));
});

after(async () => {
  withoutKey?.stop();
  withKey?.stop();
  await upstream?.close();
});

const chat = (server, messages) =>
  fetch(`${server.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

describe("POST /api/chat", () => {
  it("answers 501 until LLM_API_KEY is set", async () => {
    const res = await chat(withoutKey, [{ role: "user", content: "hi" }]);
    assert.equal(res.status, 501);
  });

  it("refuses more than 40 messages with 400", async () => {
    const res = await chat(withKey, Array.from({ length: 41 }, () => ({ role: "user", content: "hi" })));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /40 entries or fewer/);
  });

  it("refuses more than 24 000 characters with 400", async () => {
    const res = await chat(withKey, [{ role: "user", content: "x".repeat(24_001) }]);
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /24000 characters or fewer/);
  });

  it("counts characters in non-text content too", async () => {
    const res = await chat(withKey, [{ role: "user", content: [{ type: "text", text: "x".repeat(24_001) }] }]);
    assert.equal(res.status, 400);
  });

  it("answers 502 and prints why when the LLM provider fails", async () => {
    const start = withKey.output().length;
    const res = await chat(withKey, [{ role: "user", content: "hi" }]);
    assert.equal(res.status, 502);
    await eventually(() => assert.match(withKey.output().slice(start), /POST \/api\/chat →/));
  });
});
