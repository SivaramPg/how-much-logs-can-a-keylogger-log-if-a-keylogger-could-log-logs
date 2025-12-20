import { db } from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/db";
import {
  globalStats,
  keystrokeBatch,
} from "@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs/db/schema/index";
import { sql } from "drizzle-orm";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface GeoLocation {
  countryCode: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface LatencyData {
  clientTimestamp: number | null;
  serverTimestamp: number | null;
  latencyMs: number | null;
}

interface KeystrokeBuffer {
  count: number;
  ip: string | null;
  geo: GeoLocation;
  latency: LatencyData;
}

export interface Stats {
  totalKeystrokes: number;
  activeUsers: number;
  bufferedKeystrokes: number;
}

type WebSocketClient = {
  id: string;
  send: (data: string) => void;
  readyState: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per IP per window
const KEYSTROKE_LIMIT_PER_SESSION = 1000; // per minute

class StateManager {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private keystrokeRateLimits: Map<string, RateLimitEntry> = new Map();
  private keystrokeBuffer: Map<string, KeystrokeBuffer> = new Map();
  private connectedClients: Map<string, WebSocketClient> = new Map();
  private cachedTotalKeystrokes = 0;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupClientsInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    // Load initial total from database
    const stats = await db.select().from(globalStats).where(sql`${globalStats.id} = 1`).limit(1);

    if (stats.length === 0) {
      // Create initial stats row
      await db.insert(globalStats).values({ id: 1, totalKeystrokes: 0 });
      this.cachedTotalKeystrokes = 0;
    } else {
      this.cachedTotalKeystrokes = stats[0].totalKeystrokes;
    }

    // Start flush interval (every 5 seconds)
    this.flushInterval = setInterval(() => {
      this.flushToDatabase().catch(console.error);
    }, 5000);

    // Start broadcast interval (every 2 seconds)
    this.broadcastInterval = setInterval(() => {
      this.broadcastStats();
    }, 2000);

    // Clean up old rate limit entries every minute
    setInterval(() => {
      this.cleanupRateLimits();
    }, 60_000);

    // Clean up stale WebSocket clients every 30 seconds
    this.cleanupClientsInterval = setInterval(() => {
      this.cleanupStaleClients();
    }, 30_000);

    console.log(`[StateManager] Initialized with ${this.cachedTotalKeystrokes} total keystrokes`);
  }

  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(ip);

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  }

  checkKeystrokeRateLimit(sessionId: string, count: number): boolean {
    const now = Date.now();
    const entry = this.keystrokeRateLimits.get(sessionId);

    if (!entry || now > entry.resetAt) {
      this.keystrokeRateLimits.set(sessionId, {
        count,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (entry.count + count > KEYSTROKE_LIMIT_PER_SESSION) {
      return false;
    }

    entry.count += count;
    return true;
  }

  bufferKeystrokes(
    sessionId: string,
    count: number,
    ip: string | null,
    geo: GeoLocation,
    latency: LatencyData,
  ): void {
    const existing = this.keystrokeBuffer.get(sessionId);
    if (existing) {
      existing.count += count;
      // Update geo if we have new data
      if (geo.countryCode) {
        existing.geo = geo;
      }
      // Update latency with latest measurement
      if (latency.latencyMs !== null) {
        existing.latency = latency;
      }
    } else {
      this.keystrokeBuffer.set(sessionId, { count, ip, geo, latency });
    }

    // Update cached total immediately for real-time display
    this.cachedTotalKeystrokes += count;
  }

  async flushToDatabase(): Promise<void> {
    if (this.keystrokeBuffer.size === 0) {
      return;
    }

    const batches = Array.from(this.keystrokeBuffer.entries()).map(([sessionId, data]) => ({
      sessionId,
      count: data.count,
      ipAddress: data.ip,
      countryCode: data.geo.countryCode,
      country: data.geo.country,
      city: data.geo.city,
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
      clientTimestamp: data.latency.clientTimestamp,
      serverTimestamp: data.latency.serverTimestamp,
      latencyMs: data.latency.latencyMs,
    }));

    const totalCount = batches.reduce((sum, b) => sum + b.count, 0);

    // Clear buffer before async operation
    this.keystrokeBuffer.clear();

    try {
      // Insert batches
      await db.insert(keystrokeBatch).values(batches);

      // Update global stats
      await db
        .update(globalStats)
        .set({
          totalKeystrokes: sql`${globalStats.totalKeystrokes} + ${totalCount}`,
        })
        .where(sql`${globalStats.id} = 1`);

      console.log(`[StateManager] Flushed ${batches.length} batches, ${totalCount} keystrokes`);
    } catch (error) {
      console.error("[StateManager] Failed to flush to database:", error);
      // Re-add to buffer on failure
      for (const batch of batches) {
        this.bufferKeystrokes(
          batch.sessionId,
          batch.count,
          batch.ipAddress,
          {
            countryCode: batch.countryCode,
            country: batch.country,
            city: batch.city,
            latitude: batch.latitude,
            longitude: batch.longitude,
          },
          {
            clientTimestamp: batch.clientTimestamp,
            serverTimestamp: batch.serverTimestamp,
            latencyMs: batch.latencyMs,
          },
        );
      }
      // Subtract from cached total since flush failed
      this.cachedTotalKeystrokes -= totalCount;
    }
  }

  getStats(): Stats {
    return {
      totalKeystrokes: this.cachedTotalKeystrokes,
      activeUsers: this.connectedClients.size,
      bufferedKeystrokes: Array.from(this.keystrokeBuffer.values()).reduce(
        (sum, b) => sum + b.count,
        0,
      ),
    };
  }

  addClient(client: WebSocketClient): void {
    this.connectedClients.set(client.id, client);
    console.log(
      `[StateManager] Client ${client.id} connected. Total: ${this.connectedClients.size}`,
    );
  }

  removeClient(clientId: string): void {
    const deleted = this.connectedClients.delete(clientId);
    console.log(
      `[StateManager] Client ${clientId} disconnected (found: ${deleted}). Total: ${this.connectedClients.size}`,
    );
  }

  broadcastStats(): void {
    if (this.connectedClients.size === 0) {
      return;
    }

    const stats = this.getStats();
    const message = JSON.stringify({ type: "stats", data: stats });

    for (const client of this.connectedClients.values()) {
      try {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      } catch {
        // Client disconnected, will be cleaned up
      }
    }
  }

  private cleanupRateLimits(): void {
    const now = Date.now();

    for (const [key, entry] of this.rateLimits) {
      if (now > entry.resetAt) {
        this.rateLimits.delete(key);
      }
    }

    for (const [key, entry] of this.keystrokeRateLimits) {
      if (now > entry.resetAt) {
        this.keystrokeRateLimits.delete(key);
      }
    }
  }

  private cleanupStaleClients(): void {
    // WebSocket readyState values:
    // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
    let removed = 0;

    for (const [clientId, client] of this.connectedClients) {
      if (client.readyState !== 1) {
        this.connectedClients.delete(clientId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(
        `[StateManager] Cleaned up ${removed} stale clients. Active: ${this.connectedClients.size}`,
      );
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    if (this.cleanupClientsInterval) {
      clearInterval(this.cleanupClientsInterval);
    }
    await this.flushToDatabase();
  }
}

// Singleton instance
export const stateManager = new StateManager();
