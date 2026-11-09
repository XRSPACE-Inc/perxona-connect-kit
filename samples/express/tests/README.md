# Tests for the Express sample

These tests start `server.mjs` and talk to it the way the demos do. The server is pointed at a
fake Connect API that runs on your machine, so you need no key, no `.env` and no network.

## Run them

From `samples/express/`, with Node 22 or newer:

```bash
npm install
npm test
```

To run one file: `node --test tests/chatbots.test.mjs`.

## What each file covers

| File | What it checks |
| --- | --- |
| `routes.test.mjs` | Every route is still there, and the catalog routes return what the demos read |
| `chatbots.test.mjs` | Chatbot create, read, update and delete, chatting, and knowledge file uploads |
| `chat.test.mjs` | `POST /api/chat`, the route for your own LLM key |
| `errors.test.mjs` | A refusal from the Connect API reaches the browser unchanged, and is printed in the terminal |
| `embed-config.test.mjs` | Which avatar, scene, voice and chatbot `GET /api/config` gives the Embed demo |
| `startup.test.mjs` | What the server prints when `.env` is missing a key |

`helpers/stub-upstream.mjs` is the fake Connect API. `helpers/start-server.mjs` starts
`server.mjs` against it.

## Add a test

1. Pick the file that matches what you changed, or copy one of them for something new.
2. Write an `it("…", async () => { … })` that calls the server with `fetch` and checks the answer
   with `assert`.
3. If your change makes the server call an endpoint the fake does not answer yet, add it to
   `helpers/stub-upstream.mjs`. The fake answers `404` for anything it does not know.
4. If you added a route, also add it to the list at the top of `routes.test.mjs`.

For example, a check that a new `GET /api/hello` route answers:

```js
it("GET /api/hello answers 200", async () => {
  const res = await fetch(`${server.url}/api/hello`);
  assert.equal(res.status, 200);
});
```

## What is checked somewhere else

The checks that the secret key never reaches a browser, that every call to the Connect API carries
the right key and is in the API contract, and that the server refuses to start without its keys,
live in [`.github/guards/`](../../../.github/guards/). Only a code owner can change them. See
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md#checks).
