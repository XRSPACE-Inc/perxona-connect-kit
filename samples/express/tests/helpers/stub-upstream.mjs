// A fake Perxona Connect API for the tests. It runs on this machine, needs no
// key, and remembers every request it receives, so a test can check what the
// sample actually sent.
import { createServer } from "node:http";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function seedChatbots() {
  // Disabled first, then app-managed: the server's auto-pick must skip both.
  return new Map(
    [
      { id: "bot-disabled", name: "Disabled", status: "disabled", tools: [] },
      { id: "bot-app-managed", name: "[app] Some App", status: "active", tools: [] },
      { id: "bot-first", name: "First", status: "active", tools: [] },
      { id: "bot-second", name: "Second", status: "active", tools: [] },
    ].map((bot) => [bot.id, bot]),
  );
}

/**
 * Start the fake API.
 * @returns {Promise<{
 *   url: string,
 *   requests: {method: string, path: string, headers: object, body: string}[],
 *   refuse: (status: number, body?: object) => void,
 *   reset: () => void,
 *   close: () => Promise<void>,
 * }>}
 */
export async function startStubUpstream() {
  let bots = seedChatbots();
  let refusal = null;
  let seq = 0;
  const requests = [];

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const path = (req.url ?? "/").split("?")[0];
    const body = await readBody(req);
    requests.push({ method, path, headers: req.headers, body });

    const json = (status, payload) => {
      const text = JSON.stringify(payload);
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(text),
      });
      res.end(text);
    };

    if (path === "/ready") return json(200, { status: "ok" });
    // The presenter engine and the LLM provider point here too, so nothing
    // in a test leaves this machine.
    if (path === "/presenter.js") return json(200, {});
    if (path.startsWith("/llm/")) return json(503, { error: "stub LLM is down" });

    if (refusal && path.startsWith("/api/v1/connect/")) {
      return json(refusal.status, refusal.body);
    }

    const page = (items) => json(200, { items, total: items.length });
    const route = `${method} ${path}`;

    // Two of each, so "the server picks the first" is a real check.
    if (route === "GET /api/v1/connect/voices")
      return page([
        { id: "voice-first", name: "First" },
        { id: "voice-second", name: "Second" },
      ]);
    if (route === "GET /api/v1/connect/assets/avatars")
      return page([
        { avatar_id: "avatar-first", name: "First" },
        { avatar_id: "avatar-second", name: "Second" },
      ]);
    if (route === "GET /api/v1/connect/assets/scenes")
      return page([
        { scene_id: "scene-first", name: "First" },
        { scene_id: "scene-second", name: "Second" },
      ]);
    if (route === "GET /api/v1/connect/credit")
      return json(200, { used_credit_points: 1, total_credit_points: 10 });

    let m = path.match(/^\/api\/v1\/connect\/assets\/avatars\/([^/]+)(\/motions)?$/);
    if (m && method === "GET")
      return m[2]
        ? page([{ motion_id: "motion-1", tags: ["idle"] }])
        : json(200, { avatar_id: decodeURIComponent(m[1]), lod_urls: {} });
    m = path.match(/^\/api\/v1\/connect\/assets\/scenes\/([^/]+)$/);
    if (m && method === "GET")
      return json(200, { scene_id: decodeURIComponent(m[1]), lod_urls: {} });

    if (route === "GET /api/v1/connect/chatbots") return page([...bots.values()]);
    if (route === "POST /api/v1/connect/chatbots") {
      const bot = { id: `bot-new-${++seq}`, name: "New", status: "active", tools: [] };
      bots.set(bot.id, bot);
      return json(201, bot);
    }

    m = path.match(/^\/api\/v1\/connect\/chatbots\/([^/]+)(\/chat)?$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const bot = bots.get(id);
      if (m[2] && method === "POST") {
        if (!bot) return json(404, { code: 404, details: "chatbot not found" });
        return json(200, { id: "chat-1", status: "success", reply_text: "Hello" });
      }
      if (method === "GET") {
        if (!bot) return json(404, { code: 404, details: "chatbot not found" });
        return json(200, bot);
      }
      if (method === "PATCH") return json(200, bot ?? { id, name: "", status: "active", tools: [] });
      if (method === "DELETE") {
        bots.delete(id);
        res.writeHead(204);
        return res.end();
      }
    }

    json(404, { code: 404, details: `stub has no ${route}` });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    /** Answer every Connect API call with this status and body until reset(). */
    refuse(status, body = { code: 1002, details: "Request origin is not allowed for this Connect API key" }) {
      refusal = { status, body };
    },
    reset() {
      refusal = null;
      bots = seedChatbots();
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
