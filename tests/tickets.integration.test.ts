import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Client, Pool } from "pg";
import * as schema from "@/db/schema";
import type { DB } from "@/db";
import {
  QueueError,
  callNext,
  cancelByCustomer,
  getPublicQueueInfo,
  getQueueSnapshot,
  getTicketView,
  joinQueue,
  setTicketStatus,
} from "@/lib/tickets";

/**
 * Runs the real queue functions against a real PostgreSQL database.
 * Needs TEST_DATABASE_URL; CI provides one through a Postgres service container.
 */
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("queue operations (PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 25 });
  const db = drizzle(pool, { schema }) as unknown as DB;
  let bizId: string;

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE tickets, users, businesses CASCADE`);
    const [b] = await db
      .insert(schema.businesses)
      .values({ name: "Test Clinic", slug: "test-clinic", category: "Clinic", defaultMinutes: 6 })
      .returning();
    bizId = b.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("gives sequential token numbers", async () => {
    const a = await joinQueue(db, bizId, { customerName: "A" });
    const b = await joinQueue(db, bizId, { customerName: "B" });
    expect([a.number, b.number]).toEqual([1, 2]);
  });

  it("never hands out the same number when 30 people join at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => joinQueue(db, bizId, { customerName: `C${i}` })),
    );
    const numbers = results.map((r) => r.number).sort((x, y) => x - y);
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("restarts numbering on a new day in India time", async () => {
    const day1 = new Date("2026-10-14T10:00:00Z");
    const day2 = new Date("2026-10-14T19:00:00Z"); // 00:30 IST on the 15th
    await joinQueue(db, bizId, { customerName: "A" }, day1);
    await joinQueue(db, bizId, { customerName: "B" }, day1);
    const next = await joinQueue(db, bizId, { customerName: "C" }, day2);
    expect(next.number).toBe(1);
  });

  it("rejects joins when the business is closed", async () => {
    await db.update(schema.businesses).set({ isOpen: false }).where(eq(schema.businesses.id, bizId));
    await expect(joinQueue(db, bizId, { customerName: "A" })).rejects.toMatchObject({ code: "CLOSED" });
  });

  it("call next serves the current customer and calls the oldest waiting one", async () => {
    const a = await joinQueue(db, bizId, { customerName: "A" });
    const b = await joinQueue(db, bizId, { customerName: "B" });
    expect((await callNext(db, bizId))?.id).toBe(a.id);
    expect((await callNext(db, bizId))?.id).toBe(b.id);
    const snap = await getQueueSnapshot(db, bizId);
    expect(snap.servedToday).toBe(1);
    expect(snap.nowServing.map((t) => t.id)).toEqual([b.id]);
    expect(await callNext(db, bizId)).toBeNull();
  });

  it("two staff pressing call next together call two different people", async () => {
    await joinQueue(db, bizId, { customerName: "A" });
    await joinQueue(db, bizId, { customerName: "B" });
    const [x, y] = await Promise.all([callNext(db, bizId), callNext(db, bizId)]);
    expect(x?.id).not.toBe(y?.id);
  });

  it("shows each customer their position and an estimate", async () => {
    await joinQueue(db, bizId, { customerName: "A" });
    await joinQueue(db, bizId, { customerName: "B" });
    const c = await joinQueue(db, bizId, { customerName: "C" });
    await callNext(db, bizId); // A at the counter
    const view = await getTicketView(db, c.accessKey);
    expect(view).toMatchObject({ position: 2, peopleAhead: 1, status: "WAITING", nowServing: [1] });
    expect(view!.etaMinutes).toBe(9); // one ahead (6 min) + half of current (3 min)
  });

  it("lets a customer leave with their secret link, and only once", async () => {
    const a = await joinQueue(db, bizId, { customerName: "A" });
    expect((await cancelByCustomer(db, a.accessKey)).status).toBe("CANCELLED");
    await expect(cancelByCustomer(db, a.accessKey)).rejects.toBeInstanceOf(QueueError);
    await expect(cancelByCustomer(db, "not-a-real-key")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses illegal status changes", async () => {
    const a = await joinQueue(db, bizId, { customerName: "A" });
    await expect(setTicketStatus(db, bizId, a.id, "SERVED")).rejects.toMatchObject({ code: "BAD_TRANSITION" });
  });

  it("does not let one business change another business's ticket", async () => {
    const [other] = await db
      .insert(schema.businesses)
      .values({ name: "Other", slug: "other", category: "Salon" })
      .returning();
    const a = await joinQueue(db, bizId, { customerName: "A" });
    await expect(setTicketStatus(db, other.id, a.id, "SKIPPED")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("puts a recalled customer at the back of the line", async () => {
    const a = await joinQueue(db, bizId, { customerName: "A" });
    const b = await joinQueue(db, bizId, { customerName: "B" });
    await setTicketStatus(db, bizId, a.id, "SKIPPED");
    await setTicketStatus(db, bizId, a.id, "WAITING");
    const snap = await getQueueSnapshot(db, bizId);
    expect(snap.waiting.map((w) => w.id)).toEqual([b.id, a.id]);
  });

  it("public queue info exposes counts only, never names or phone numbers", async () => {
    await joinQueue(db, bizId, { customerName: "Secret Name", phone: "+919876543210" });
    const info = await getPublicQueueInfo(db, "test-clinic");
    const json = JSON.stringify(info);
    expect(json).not.toContain("Secret Name");
    expect(json).not.toContain("9876543210");
    expect(info?.waitingCount).toBe(1);
  });

  it("publishes a change event only after the write commits", async () => {
    const listener = new Client({ connectionString: url });
    await listener.connect();
    await listener.query("LISTEN queue_events");
    const received: string[] = [];
    listener.on("notification", (m) => received.push(m.payload ?? ""));

    await joinQueue(db, bizId, { customerName: "A" });
    await db.update(schema.businesses).set({ isOpen: false }).where(eq(schema.businesses.id, bizId));
    await joinQueue(db, bizId, { customerName: "B" }).catch(() => {}); // rolled back: no event
    await new Promise((r) => setTimeout(r, 200));
    await listener.end();
    expect(received).toEqual([bizId]);
  });
});
