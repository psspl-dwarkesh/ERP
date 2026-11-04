/**
 * Live updates for concurrent users (Server-Sent Events).
 * After any command commits, every connected session that may view the command's
 * module is told "something changed" plus who did what, so their screens refetch.
 * Payloads carry no record data — only the actor, a short action label and the reference.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ModuleKey } from "../../prototype/src/api/types";
import { can, type Actor } from "./core";
import { env } from "./env";

type Client = { actor: Actor; reply: FastifyReply };
const clients = new Set<Client>();

export interface LiveEvent {
  command: string;
  module: ModuleKey;
  actor: string;
  actorId: string;
  at: string;
}

export function broadcast(e: LiveEvent) {
  const line = `event: change\ndata: ${JSON.stringify(e)}\n\n`;
  for (const c of clients) {
    if (!can(c.actor, e.module, "view") && e.module !== "dashboard") continue;
    try {
      c.reply.raw.write(line);
    } catch {
      clients.delete(c);
    }
  }
}

export const liveCount = () => new Set([...clients].map((c) => c.actor.userId)).size;

/** Everyone connected learns how many people are online (distinct users, not tabs). */
function presence() {
  const line = `event: presence\ndata: ${JSON.stringify({ online: liveCount() })}\n\n`;
  for (const c of clients) {
    try {
      c.reply.raw.write(line);
    } catch {
      clients.delete(c);
    }
  }
}

export function registerLive(app: FastifyInstance, actorOf: (req: FastifyRequest) => Actor) {
  app.get("/api/events", async (req, reply) => {
    const actor = actorOf(req);
    reply.hijack();
    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };
    // hijack() + raw.writeHead bypasses the global CORS hook, so the EventSource
    // (opened withCredentials cross-origin) needs these set on the stream itself.
    const origin = req.headers.origin;
    if (origin && env.corsOrigin !== "" && (env.corsOrigin === "*" || origin === env.corsOrigin)) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Vary"] = "Origin";
      headers["Access-Control-Allow-Credentials"] = "true";
    }
    reply.raw.writeHead(200, headers);
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ online: clients.size + 1 })}\n\n`);
    const client: Client = { actor, reply };
    clients.add(client);
    presence();
    // Comment frames keep proxies (Render, Vite) from closing an idle stream.
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 25_000);
    req.raw.on("close", () => {
      clearInterval(ping);
      clients.delete(client);
      presence();
    });
  });
}
