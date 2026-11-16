// Perxona Connect Kit: chatbot relay for Lovable Cloud (a Supabase Edge Function).
//
// Only needed when the avatar should answer through a PERXONA CHATBOT (one you created in the
// Perxona Console or the Express sample's Studio, with its own persona and knowledge file).
// Talking to a chatbot needs the SECRET Connect key, and the secret key must never reach the
// browser, so this function holds it and relays one thing: chat messages.
//
// Set these as Lovable Cloud secrets (never in code, never in the chat with the AI):
//   PERXONA_CONNECT_SECRET_KEY   the secret Connect key, with an EMPTY allowed-domain list
//   PERXONA_CHATBOT_ID           the chatbot to talk to
//   PERXONA_REGION               optional, "asia" (default) or "eu"
//
// Request:  POST { messages: [{ role: "user" | "assistant", text: string }, ...] }
// Response: { reply_text: string }  → pass it to presenter.present(reply_text)
//           { error, code? } on failure. code 1003 / 14005 mean the organization's credits
//           or subscription need attention in the Perxona Console.
//
// This endpoint is public and every call spends the organization's credits. The size caps
// below stop one request from running away; they are not a rate limiter. Fine for a hackathon,
// put real authorization in front of it before anything else.

const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 24_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Turn = { role: "user" | "assistant"; text: string };

function validate(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return "'messages' must be a non-empty array.";
  if (messages.length > MAX_MESSAGES) return `'messages' must have ${MAX_MESSAGES} items or fewer.`;
  let total = 0;
  for (const m of messages as Turn[]) {
    if ((m?.role !== "user" && m?.role !== "assistant") || typeof m?.text !== "string") {
      return "Each message must be { role: 'user' | 'assistant', text: string }.";
    }
    total += m.text.length;
  }
  return total > MAX_TOTAL_CHARS ? `'messages' must total ${MAX_TOTAL_CHARS} characters or fewer.` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const secretKey = Deno.env.get("PERXONA_CONNECT_SECRET_KEY");
  const chatbotId = Deno.env.get("PERXONA_CHATBOT_ID");
  const region = Deno.env.get("PERXONA_REGION") || "asia";
  if (!secretKey || !chatbotId) {
    return json({ error: "Set PERXONA_CONNECT_SECRET_KEY and PERXONA_CHATBOT_ID as Lovable Cloud secrets." }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const invalid = validate(body?.messages);
  if (invalid) return json({ error: invalid }, 400);

  // The Connect chat API takes "parts", not "content".
  const messages = (body.messages as Turn[]).map(({ role, text }) => ({
    role,
    parts: [{ type: "text", text }],
  }));

  const upstream = await fetch(
    `https://console.perxona.ai/${region}/api/v1/connect/chatbots/${encodeURIComponent(chatbotId)}/chat`,
    {
      method: "POST",
      // X-Connect-Key only. Adding an Authorization header as well makes the API answer 400.
      headers: { "Content-Type": "application/json", "X-Connect-Key": secretKey },
      body: JSON.stringify({ messages }),
    },
  );
  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    // Never echo data.details back to the page: it contains the organization id.
    const code = typeof data?.code === "number" ? data.code : undefined;
    console.error(`perxona-chat: upstream ${upstream.status}`, data);
    return json({ error: "The Perxona chatbot could not answer.", code }, upstream.status);
  }
  if (!data?.reply_text) return json({ error: `Chatbot returned status "${data?.status}".` }, 502);
  return json({ reply_text: data.reply_text });
});
