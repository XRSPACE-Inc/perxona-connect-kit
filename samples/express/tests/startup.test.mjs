// What the server prints when .env is missing a key. Whether it refuses to
// start at all is checked separately, outside this folder.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleEnv, startServerExpectingExit } from "./helpers/start-server.mjs";

// Never contacted: the server stops before its first request.
const UNUSED_URL = "http://127.0.0.1:9";

describe("startup messages", () => {
  it("names the missing key when only one is set", async () => {
    const { output } = await startServerExpectingExit(
      sampleEnv(UNUSED_URL, { PERXONA_CONNECT_PUBLISHABLE_KEY: "" }),
    );
    assert.match(output, /PERXONA_CONNECT_PUBLISHABLE_KEY is not set/);
  });

  it("explains which key goes where when neither is set", async () => {
    const { output } = await startServerExpectingExit(
      sampleEnv(UNUSED_URL, { PERXONA_CONNECT_SECRET_KEY: "", PERXONA_CONNECT_PUBLISHABLE_KEY: "" }),
    );
    assert.match(output, /PERXONA_CONNECT_SECRET_KEY/);
    assert.match(output, /PERXONA_CONNECT_PUBLISHABLE_KEY/);
    assert.match(output, /must never reach a browser/);
    assert.doesNotMatch(output, /PERXONA_CONNECT_EMAIL/);
  });

  it("tells an old .env with email and password that they are no longer read", async () => {
    const { output } = await startServerExpectingExit(
      sampleEnv(UNUSED_URL, {
        PERXONA_CONNECT_SECRET_KEY: "",
        PERXONA_CONNECT_PUBLISHABLE_KEY: "",
        PERXONA_CONNECT_EMAIL: "someone@example.com",
        PERXONA_CONNECT_PASSWORD: "whatever",
      }),
    );
    assert.match(output, /no longer read/);
  });
});
