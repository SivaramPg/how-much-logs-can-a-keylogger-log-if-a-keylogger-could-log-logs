import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { createContext } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/api/context";
import { appRouter } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/api/routers/index";
import { auth } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/auth";
import { db } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/db";
import { keystrokeBatch } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/db/schema/index";
import { sql } from "drizzle-orm";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia, t } from "elysia";
import { stateManager } from "./lib/state";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// Initialize state manager before starting server
await stateManager.initialize();

new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  // WebSocket for live stats
  .ws("/ws", {
    // Auto-close idle connections after 60 seconds of no activity
    idleTimeout: 60,
    open(ws) {
      stateManager.addClient({
        id: ws.id,
        send: (data) => ws.send(data),
        readyState: ws.readyState,
      });
      // Send current stats immediately on connect
      // Format: [totalKeystrokes, activeUsers, bufferedKeystrokes]
      ws.send(JSON.stringify(stateManager.getStatsArray()));
    },
    close(ws) {
      stateManager.removeClient(ws.id);
    },
    message(_ws, _message) {
      // No client->server messages needed for now
    },
  })
  // Keystroke ingestion endpoint (fire-and-forget)
  .post(
    "/keystrokes",
    async ({ body, request, set, server }) => {
      const serverTimestamp = Date.now();
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        server?.requestIP(request)?.address ||
        "unknown";

      // Read Cloudflare geolocation headers (enable "Add visitor location headers" managed transform)
      const geo = {
        countryCode: request.headers.get("cf-ipcountry"),
        country: request.headers.get("cf-region"), // Region name (e.g., "California")
        city: request.headers.get("cf-ipcity"),
        latitude: parseFloat(request.headers.get("cf-iplatitude") || "") || null,
        longitude: parseFloat(request.headers.get("cf-iplongitude") || "") || null,
        continent: request.headers.get("cf-ipcontinent"),
        regionCode: request.headers.get("cf-region-code"),
        postalCode: request.headers.get("cf-postal-code"),
        timezone: request.headers.get("cf-timezone"),
      };

      // Calculate latency (server time - client time)
      const clientTimestamp = body.timestamp || null;
      const latencyMs = clientTimestamp ? serverTimestamp - clientTimestamp : null;
      const latency = {
        clientTimestamp,
        serverTimestamp,
        latencyMs,
      };

      // Rate limit check (silently drop if exceeded)
      if (ip && !stateManager.checkRateLimit(ip)) {
        set.status = 429;
        return { success: false, error: "rate_limited" };
      }

      // Keystroke rate limit check
      if (!stateManager.checkKeystrokeRateLimit(body.sessionId, body.count)) {
        set.status = 429;
        return { success: false, error: "keystroke_limit" };
      }

      // Buffer the keystrokes
      stateManager.bufferKeystrokes(body.sessionId, body.count, ip, geo, latency);

      return { success: true };
    },
    {
      body: t.Object({
        sessionId: t.String(),
        count: t.Number({ minimum: 1, maximum: 100 }),
        timestamp: t.Optional(t.Number()),
      }),
    },
  )
  // Get current stats (for initial load)
  .get("/stats", () => {
    return stateManager.getStats();
  })
  // Get location stats for heatmap
  .get("/stats/locations", async () => {
    const results = await db
      .select({
        countryCode: keystrokeBatch.countryCode,
        totalKeystrokes: sql<number>`sum(${keystrokeBatch.count})::int`,
      })
      .from(keystrokeBatch)
      .where(sql`${keystrokeBatch.countryCode} IS NOT NULL`)
      .groupBy(keystrokeBatch.countryCode)
      .orderBy(sql`sum(${keystrokeBatch.count}) DESC`);

    return results;
  })
  // Get latency stats
  .get("/stats/latency", async () => {
    const results = await db
      .select({
        sessionId: keystrokeBatch.sessionId,
        avgLatency: sql<number>`avg(${keystrokeBatch.latencyMs})::int`,
        minLatency: sql<number>`min(${keystrokeBatch.latencyMs})::int`,
        maxLatency: sql<number>`max(${keystrokeBatch.latencyMs})::int`,
        sampleCount: sql<number>`count(*)::int`,
        totalKeystrokes: sql<number>`sum(${keystrokeBatch.count})::int`,
        countryCode: keystrokeBatch.countryCode,
        lastSeen: sql<string>`to_char(max(${keystrokeBatch.createdAt}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      })
      .from(keystrokeBatch)
      .where(sql`${keystrokeBatch.latencyMs} IS NOT NULL`)
      .groupBy(keystrokeBatch.sessionId, keystrokeBatch.countryCode)
      .having(sql`count(*) >= 1`) // Show latency data immediately
      .orderBy(sql`sum(${keystrokeBatch.count}) DESC`) // Leaderboard: most keystrokes first
      .limit(50);

    return results;
  })
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .all("/rpc*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .all("/api*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api-reference",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await stateManager.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down...");
  await stateManager.shutdown();
  process.exit(0);
});
