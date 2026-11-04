/**
 * POST /api/assist { question } → { answer, points, citations, model }
 *
 * Answers a question about the ERP with Claude, grounded only in records the signed-in
 * user may view (see context.ts). Off unless ANTHROPIC_API_KEY is set: without it the
 * route answers 501 NOT_CONFIGURED and the front end computes the answer locally.
 *
 * Config (all optional except the key):
 *   ANTHROPIC_API_KEY   enables the route
 *   ASSIST_MODEL        model id, default claude-opus-5-5
 *   ASSIST_EFFORT       low | medium | high (default medium)
 *   ASSIST_RATE_LIMIT   questions per user per 10 minutes (default 20)
 */
import Anthropic from "@anthropic-ai/sdk";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireLevel, type Actor } from "../core";
import type { Database } from "../db/client";
import { buildContext } from "./context";

const Body = z.object({ question: z.string().trim().min(3, "Ask a question of at least 3 characters.").max(400, "Keep the question under 400 characters.") });

const Output = z.object({
  answer: z.string(),
  points: z.array(z.string()),
  citations: z.array(z.string()),
});

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "points", "citations"],
  properties: {
    answer: { type: "string", description: "One to three plain sentences that answer the question directly." },
    points: { type: "array", items: { type: "string" }, description: "Up to six short supporting facts, each a plain sentence. Empty if not needed." },
    citations: { type: "array", items: { type: "string" }, description: "Every record id the answer relies on, e.g. PRJ-0264, PR-0084." },
  },
};

const SYSTEM = `You are Threadline Assist, the analysis assistant inside the Threadline ERP used by Pinnacle Engineering, an engineering, panel-manufacturing and field-service company in India. The workspace holds illustrative demo records.

Answer the user's question using only the JSON context in their message: "records" are the ERP records their role may view, "findings" are rule-based analysis already computed from those records, and "meta" gives the business date, time and the user's role. Prefer the findings' numbers when they cover the question, so your answer agrees with the Insights page.

Rules:
- Use only facts present in the context. If the answer depends on a module listed in meta.modulesNotVisible, say that it is outside the user's role rather than guessing. If the context doesn't contain the answer, say so plainly.
- Cite every record id you rely on, exactly as written in the context. Never invent ids.
- You can read but not change anything. When an action is needed, say who should do what on which record.
- Write plainly for an operations manager: short sentences, no markdown, no headings. Money in Indian units (₹2.84 L, ₹1.37 Cr, ₹65,600). Dates like 18 Nov; times in 24-hour IST.`;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 }));

/* ---- per-user rate limit (in memory; one process) ---- */
const WINDOW_MS = 10 * 60_000;
const hits = new Map<string, number[]>();
function allow(userId: string) {
  const limit = Number(process.env.ASSIST_RATE_LIMIT ?? 20);
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

export function registerAssist(app: FastifyInstance, db: Database, actorOf: (req: FastifyRequest) => Actor) {
  app.post<{ Body: unknown }>("/api/assist", async (req, reply) => {
    const actor = actorOf(req); // 401 without a session
    requireLevel(actor, "insights", "view");
    const { question } = Body.parse(req.body ?? {});

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(501).send({ error: { code: "NOT_CONFIGURED", message: "Claude isn't configured on this server. Set ANTHROPIC_API_KEY to enable it; answers are computed from your ERP data instead." } });
    }
    if (!allow(actor.userId)) {
      return reply.status(429).send({ error: { code: "RATE_LIMITED", message: "That's a lot of questions in a short time. Try again in a few minutes." } });
    }

    const ctx = await buildContext(db, actor);
    const model = process.env.ASSIST_MODEL || "claude-opus-5-5";
    const effort = (["low", "medium", "high"] as const).find((e) => e === process.env.ASSIST_EFFORT) ?? "medium";

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await getClient().beta.messages.create({
        model,
        max_tokens: 16000,
        // On a safety decline the API re-runs the request on Anthropic's recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort, format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        system: [{ type: "text", text: SYSTEM }],
        messages: [
          {
            role: "user",
            content: [
              // Stable per role and data version, so repeat questions read it from the prompt cache.
              { type: "text", text: `ERP context (JSON):\n${ctx.json}`, cache_control: { type: "ephemeral" } },
              { type: "text", text: `Question: ${question}` },
            ],
          },
        ],
      });
    } catch (e) {
      const status = e instanceof Anthropic.RateLimitError ? 503 : 502;
      const why =
        e instanceof Anthropic.AuthenticationError
          ? "the server's Anthropic API key was rejected"
          : e instanceof Anthropic.RateLimitError
            ? "Claude is rate-limited right now"
            : e instanceof Anthropic.APIConnectionError
              ? "Claude couldn't be reached"
              : e instanceof Anthropic.APIError
                ? `Claude returned an error (${e.status ?? "unknown"})`
                : "Claude failed";
      req.log.warn({ err: e instanceof Error ? e.message : String(e), model }, "assist: Claude call failed");
      return reply.status(status).send({ error: { code: "UPSTREAM", message: `${why[0].toUpperCase()}${why.slice(1)}.` } });
    }

    if (message.stop_reason === "refusal") {
      return reply.status(502).send({ error: { code: "UPSTREAM", message: "Claude declined to answer that question." } });
    }
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let out: z.infer<typeof Output>;
    try {
      out = Output.parse(JSON.parse(text));
    } catch {
      req.log.warn({ model, stop: message.stop_reason }, "assist: unparseable output");
      return reply.status(502).send({ error: { code: "UPSTREAM", message: "Claude's answer couldn't be read." } });
    }

    // Only cite records that were in this user's context: never a hallucinated or hidden id.
    const citations = [...new Set(out.citations.map((c) => c.trim().toUpperCase()))].filter((c) => ctx.ids.has(c));
    req.log.info(
      { assist: { user: actor.userId, model: message.model, in: message.usage.input_tokens, cacheRead: message.usage.cache_read_input_tokens ?? 0, out: message.usage.output_tokens } },
      "assist: answered",
    );
    return { answer: out.answer, points: out.points.slice(0, 8), citations, model: message.model };
  });
}
