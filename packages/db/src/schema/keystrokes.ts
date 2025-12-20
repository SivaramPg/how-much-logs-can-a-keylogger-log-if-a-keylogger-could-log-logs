import {
  bigint,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { session } from "./auth";

export const keystrokeBatch = pgTable("keystroke_batch", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").references(() => session.id, {
    onDelete: "set null",
  }),
  count: integer("count").notNull(),
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  country: text("country"),
  city: text("city"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Latency tracking
  clientTimestamp: bigint("client_timestamp", { mode: "number" }), // Client's Date.now()
  serverTimestamp: bigint("server_timestamp", { mode: "number" }), // Server's Date.now()
  latencyMs: integer("latency_ms"), // serverTimestamp - clientTimestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const globalStats = pgTable("global_stats", {
  id: integer("id").primaryKey().default(1),
  totalKeystrokes: bigint("total_keystrokes", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
