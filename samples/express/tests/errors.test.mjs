// When the Connect API says no, the browser gets the same status and body,
// and the terminal running the server says why.
import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import { eventually, sampleEnv, startServer } from "./helpers/start-server.mjs";
import { startStubUpstream } from "./helpers/stub-upstream.mjs";

let upstream;
let server;

before(async () => {
  upstream = await startStubUpstream();
  server = await startServer(sampleEnv(upstream.url));
});

afterEach(() => upstream.reset());

after(async () => {
  server?.stop();
  await upstream?.close();
});

describe("Connect API errors", () => {
  it("passes a 403 through with its own status and body, and asks only once", async () => {
    const voiceCalls = () => upstream.requests.filter((r) => r.path === "/api/v1/connect/voices").length;
    const before = voiceCalls();
    upstream.refuse(403);

    const res = await fetch(`${server.url}/api/voices`);
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), {
      code: 1002,
      details: "Request origin is not allowed for this Connect API key",
    });
    assert.equal(voiceCalls(), before + 1);
  });

  it("passes a used-up-credits body through unchanged", async () => {
    const credits = { code: 1003, details: "credit_points exhausted for org_id: test-org" };
    upstream.refuse(400, credits);

    const res = await fetch(`${server.url}/api/chatbots/bot-first/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "Hi" }] }] }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), credits);
  });

  it("prints the refusal and its reason in the server's terminal", async () => {
    const start = server.output().length;
    upstream.refuse(403);
    await fetch(`${server.url}/api/voices`);

    await eventually(() => {
      const logged = server.output().slice(start);
      assert.match(logged, /GET \/api\/voices → 403/);
      assert.match(logged, /Request origin is not allowed/);
    });
  });
});
