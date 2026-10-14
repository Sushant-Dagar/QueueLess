import { Client } from "pg";
import { sql } from "drizzle-orm";
import type { DB } from "../db";

/**
 * Real-time fan-out built on PostgreSQL LISTEN/NOTIFY.
 *
 * Every write that changes a queue calls `notifyQueueChanged` inside its transaction, so the
 * notification is only delivered if the write commits. Each server instance keeps ONE dedicated
 * LISTEN connection and fans events out to its open Server-Sent Events streams. That means the app
 * scales to several instances without a separate message broker, and no stream ever polls the DB.
 */

const CHANNEL = "queue_events";
type Listener = () => void;

type RealtimeState = { client: Client | null; connecting: Promise<void> | null; subs: Map<string, Set<Listener>> };
const globalForRt = globalThis as unknown as { rt?: RealtimeState };
const rt: RealtimeState = (globalForRt.rt ??= { client: null, connecting: null, subs: new Map() });

async function ensureListening(): Promise<void> {
  if (rt.client) return;
  if (rt.connecting) return rt.connecting;
  rt.connecting = (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      rt.subs.get(msg.payload)?.forEach((fn) => fn());
    });
    client.on("error", () => {
      // Drop the broken connection; the next subscriber reconnects. Clients also reconnect on their side.
      rt.client = null;
      client.end().catch(() => {});
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    rt.client = client;
  })().finally(() => {
    rt.connecting = null;
  });
  return rt.connecting;
}

/** Subscribe to changes for one business. Returns an unsubscribe function. */
export async function subscribe(businessId: string, fn: Listener): Promise<() => void> {
  await ensureListening();
  let set = rt.subs.get(businessId);
  if (!set) rt.subs.set(businessId, (set = new Set<Listener>()));
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) rt.subs.delete(businessId);
  };
}

/** Queue a change notification; delivered when the surrounding transaction commits. */
export async function notifyQueueChanged(tx: Pick<DB, "execute">, businessId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_notify(${CHANNEL}, ${businessId})`);
}
