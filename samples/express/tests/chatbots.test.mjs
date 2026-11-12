// The chatbot routes: what they accept, what they refuse, and what they return.
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

function send(method, path, body) {
  return fetch(`${server.url}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const base64 = (text) => Buffer.from(text).toString("base64");
const hello = [{ role: "user", parts: [{ type: "text", text: "Hello" }] }];

describe("chatbot CRUD", () => {
  it("GET /api/chatbots returns { items }", async () => {
    const res = await send("GET", "/api/chatbots");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.items.length > 0);
    assert.equal(typeof body.items[0].id, "string");
  });

  it("POST /api/chatbots creates one and answers 200", async () => {
    const res = await send("POST", "/api/chatbots", { name: "Test Bot" });
    assert.equal(res.status, 200);
    assert.equal(typeof (await res.json()).id, "string");
  });

  it("POST /api/chatbots without a name is refused with 400", async () => {
    const res = await send("POST", "/api/chatbots", { custom_instructions: "x" });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  it("POST /api/chatbots with a name that is not text is refused with 400", async () => {
    assert.equal((await send("POST", "/api/chatbots", { name: 42 })).status, 400);
  });

  it("GET /api/chatbots/:id returns the chatbot", async () => {
    const res = await send("GET", "/api/chatbots/bot-first");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).id, "bot-first");
  });

  it("PATCH /api/chatbots/:id returns the chatbot", async () => {
    const res = await send("PATCH", "/api/chatbots/bot-first", { name: "Renamed" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).id, "bot-first");
  });

  it("DELETE /api/chatbots/:id answers 204", async () => {
    const created = await (await send("POST", "/api/chatbots", { name: "Delete me" })).json();
    assert.equal((await send("DELETE", `/api/chatbots/${created.id}`)).status, 204);
  });
});

describe("chatting with a chatbot", () => {
  it("POST /api/chatbots/:id/chat returns { status, reply_text }", async () => {
    const res = await send("POST", "/api/chatbots/bot-first/chat", { messages: hello });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
    assert.equal(typeof body.reply_text, "string");
  });

  it("refuses an empty conversation with 400", async () => {
    const res = await send("POST", "/api/chatbots/bot-first/chat", { messages: [] });
    assert.equal(res.status, 400);
  });

  it("refuses a request with no messages with 400", async () => {
    assert.equal((await send("POST", "/api/chatbots/bot-first/chat", {})).status, 400);
  });

  it("refuses more than 40 messages with 400", async () => {
    const messages = Array.from({ length: 41 }, () => hello[0]);
    const res = await send("POST", "/api/chatbots/bot-first/chat", { messages });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /40 entries or fewer/);
  });

  it("refuses more than 24 000 characters with 400", async () => {
    const messages = [{ role: "user", parts: [{ type: "text", text: "x".repeat(24_001) }] }];
    const res = await send("POST", "/api/chatbots/bot-first/chat", { messages });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /24000 characters or fewer/);
  });
});

describe("knowledge files", () => {
  const upload = (body) => send("POST", "/api/chatbots/bot-first/knowledge", body);

  it("accepts a small text file", async () => {
    const res = await upload({ filename: "notes.txt", content_base64: base64("hi"), mime_type: "text/plain" });
    assert.equal(res.status, 200);
  });

  it("refuses an upload without a filename", async () => {
    assert.equal((await upload({ content_base64: base64("hi") })).status, 400);
  });

  it("refuses a file type that is not allowed", async () => {
    const res = await upload({ filename: "evil.js", content_base64: base64("x"), mime_type: "text/javascript" });
    assert.equal(res.status, 400);
  });

  it("refuses a filename with a path in it", async () => {
    const res = await upload({ filename: "../../etc/passwd", content_base64: base64("x"), mime_type: "text/plain" });
    assert.equal(res.status, 400);
  });

  it("refuses content that is not base64", async () => {
    const res = await upload({ filename: "notes.txt", content_base64: "!!!", mime_type: "text/plain" });
    assert.equal(res.status, 400);
  });

  it("refuses a file over 1 MB with a JSON error", async () => {
    const content = Buffer.alloc(1024 * 1024 + 1, "a").toString("base64");
    const res = await upload({ filename: "big.txt", content_base64: content, mime_type: "text/plain" });
    assert.equal(res.status, 413);
    assert.match((await res.json()).error, /1 MB/);
  });

  it("refuses a request body over 5 MB with the same JSON error", async () => {
    const content = Buffer.alloc(4 * 1024 * 1024, "a").toString("base64");
    const res = await upload({ filename: "huge.txt", content_base64: content, mime_type: "text/plain" });
    assert.equal(res.status, 413);
    assert.match(res.headers.get("content-type"), /application\/json/);
    assert.match((await res.json()).error, /1 MB/);
  });

  it("DELETE /api/chatbots/:id/knowledge answers 200", async () => {
    assert.equal((await send("DELETE", "/api/chatbots/bot-first/knowledge")).status, 200);
  });
});
