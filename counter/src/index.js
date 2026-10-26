// Visitor counter for bimikel.github.io, running on Cloudflare Workers.
//
// Two endpoints:
//   POST /hit    -> adds 1 to the count and returns it   {"views": 1285}
//   GET  /count  -> returns the count without changing it {"views": 1285}
//
// The count lives in a Durable Object: a tiny piece of storage that
// Cloudflare guarantees only one request at a time can change. That
// matters because two visitors arriving at the same moment must give
// 2 new views, not 1 (a "lost update").

import { DurableObject } from "cloudflare:workers";

// Only your site's pages are allowed to read or bump the count.
const ALLOWED_ORIGINS = [
  "https://bimikel.github.io",
  "http://localhost:8000", // python3 -m http.server, for local testing
];

export class Counter extends DurableObject {
  async hit() {
    const views = ((await this.ctx.storage.get("views")) ?? 0) + 1;
    await this.ctx.storage.put("views", views);
    return views;
  }

  async read() {
    return (await this.ctx.storage.get("views")) ?? 0;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = ALLOWED_ORIGINS.includes(origin);

    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(allowed && {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST",
        "Vary": "Origin",
      }),
    };

    // Browsers send this "preflight" check before some cross-site requests.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers });
    }

    // One shared counter for the whole site, looked up by name.
    const counter = env.COUNTER.get(env.COUNTER.idFromName("site"));

    if (url.pathname === "/count" && request.method === "GET") {
      return Response.json({ views: await counter.read() }, { headers });
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      // Refuse bumps from other websites. (A determined person could still
      // fake this header with curl; that's fine for a personal-site counter.)
      if (!allowed) {
        return Response.json({ error: "origin not allowed" }, { status: 403, headers });
      }
      return Response.json({ views: await counter.hit() }, { headers });
    }

    return Response.json({ error: "not found" }, { status: 404, headers });
  },
};
