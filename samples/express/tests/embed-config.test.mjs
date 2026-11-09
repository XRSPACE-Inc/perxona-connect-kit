// Which avatar, scene, voice and chatbot the Embed demo gets on GET /api/config
// when nothing is pinned in .env, and when something is.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eventually, sampleEnv, startServer } from "./helpers/start-server.mjs";
import { startStubUpstream } from "./helpers/stub-upstream.mjs";

let upstream;

before(async () => {
  upstream = await startStubUpstream();
});

after(() => upstream?.close());

const config = async (server) => (await fetch(`${server.url}/api/config`)).json();

describe("nothing pinned in .env", () => {
  let server;

  before(async () => {
    server = await startServer(sampleEnv(upstream.url));
  });

  after(() => server?.stop());

  it("picks the first avatar, scene and voice", async () => {
    const body = await config(server);
    assert.deepEqual(body.fixedTarget, {
      avatarId: "avatar-first",
      sceneId: "scene-first",
      voiceId: "voice-first",
    });
  });

  it("skips disabled and app-managed chatbots", async () => {
    assert.equal((await config(server)).chatbotId, "bot-first");
  });

  it("does not look the catalog up again on every request", async () => {
    const catalogCalls = () => upstream.requests.filter((r) => r.path === "/api/v1/connect/assets/avatars").length;
    await config(server);
    const before = catalogCalls();
    await Promise.all([config(server), config(server)]);
    assert.equal(catalogCalls(), before);
  });

  it("picks another chatbot after the picked one is deleted", async () => {
    const del = await fetch(`${server.url}/api/chatbots/bot-first`, { method: "DELETE" });
    assert.equal(del.status, 204);
    assert.equal((await config(server)).chatbotId, "bot-second");
  });

  it("reports no chatbot, and says why, when none can be picked", async () => {
    await fetch(`${server.url}/api/chatbots/bot-second`, { method: "DELETE" });
    const start = server.output().length;
    assert.equal((await config(server)).chatbotId, null);
    await eventually(() =>
      assert.match(server.output().slice(start), /None of the 2 chatbot\(s\) in this account can be auto-selected/),
    );
  });
});

describe("values pinned in .env", () => {
  let server;

  before(async () => {
    server = await startServer(
      sampleEnv(upstream.url, {
        DEMO_FIXED_AVATAR_ID: "avatar-pinned",
        DEMO_FIXED_SCENE_ID: "scene-pinned",
        DEMO_FIXED_CHATBOT_ID: "bot-pinned",
      }),
    );
  });

  after(() => server?.stop());

  it("returns the pinned values as they are", async () => {
    const body = await config(server);
    assert.deepEqual(body.fixedTarget, { avatarId: "avatar-pinned", sceneId: "scene-pinned" });
    assert.equal(body.chatbotId, "bot-pinned");
  });
});
