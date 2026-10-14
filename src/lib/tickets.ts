import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { DB } from "../db";
import { businesses, tickets, type Business, type Ticket, type TicketStatus } from "../db/schema";
import { createAccessKey } from "./id";
import { notifyQueueChanged } from "./realtime";
import {
  averageServiceMinutes,
  canTransition,
  estimateWaitMinutes,
  positionOf,
  serviceDateIST,
} from "./queue";

/** Queue operations. Every function takes the db handle so tests can run them against a test database. */

export const MAX_WAITING = 200;

export class QueueError extends Error {
  constructor(
    public readonly code: "CLOSED" | "FULL" | "NOT_FOUND" | "BAD_TRANSITION" | "EMPTY",
    message: string,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Serialises writes to one business's queue for the rest of the transaction, so two customers
 * joining in the same millisecond can never receive the same token number, and two staff pressing
 * "Call next" together can never call the same person.
 */
async function lockQueue(tx: Tx, businessId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${businessId}))`);
}

export async function joinQueue(
  db: DB,
  businessId: string,
  input: { customerName: string; phone?: string | null },
  now: Date = new Date(),
): Promise<Ticket> {
  return db.transaction(async (tx) => {
    await lockQueue(tx, businessId);
    const [biz] = await tx.select().from(businesses).where(eq(businesses.id, businessId));
    if (!biz) throw new QueueError("NOT_FOUND", "Queue not found");
    if (!biz.isOpen) throw new QueueError("CLOSED", "This queue is closed right now");

    const day = serviceDateIST(now);
    const [{ waiting }] = await tx
      .select({ waiting: sql<number>`count(*)::int` })
      .from(tickets)
      .where(and(eq(tickets.businessId, businessId), eq(tickets.status, "WAITING"), eq(tickets.serviceDate, day)));
    if (waiting >= MAX_WAITING) throw new QueueError("FULL", "The queue is full, please try later");

    const [{ last }] = await tx
      .select({ last: sql<number>`coalesce(max(${tickets.number}), 0)::int` })
      .from(tickets)
      .where(and(eq(tickets.businessId, businessId), eq(tickets.serviceDate, day)));

    const [ticket] = await tx
      .insert(tickets)
      .values({
        businessId,
        number: last + 1,
        serviceDate: day,
        customerName: input.customerName,
        phone: input.phone ?? null,
        accessKey: createAccessKey(),
        createdAt: now,
      })
      .returning();
    await notifyQueueChanged(tx, businessId);
    return ticket;
  });
}

/**
 * Finishes whoever is at the counter (marks them SERVED) and calls the oldest waiting ticket.
 * Returns the newly called ticket, or null when nobody is waiting.
 */
export async function callNext(db: DB, businessId: string, now: Date = new Date()): Promise<Ticket | null> {
  return db.transaction(async (tx) => {
    await lockQueue(tx, businessId);
    await tx
      .update(tickets)
      .set({ status: "SERVED", finishedAt: now })
      .where(and(eq(tickets.businessId, businessId), eq(tickets.status, "CALLED")));

    // Only today's line: a ticket left WAITING from yesterday is never called.
    const [next] = await tx
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.businessId, businessId),
          eq(tickets.status, "WAITING"),
          eq(tickets.serviceDate, serviceDateIST(now)),
        ),
      )
      .orderBy(asc(tickets.createdAt), asc(tickets.number))
      .limit(1);

    let called: Ticket | null = null;
    if (next) {
      [called] = await tx
        .update(tickets)
        .set({ status: "CALLED", calledAt: now })
        .where(eq(tickets.id, next.id))
        .returning();
    }
    await notifyQueueChanged(tx, businessId);
    return called;
  });
}

/** Staff action on a specific ticket (serve, skip, recall). Checks the move is legal. */
export async function setTicketStatus(
  db: DB,
  businessId: string,
  ticketId: string,
  to: TicketStatus,
  now: Date = new Date(),
): Promise<Ticket> {
  return db.transaction(async (tx) => {
    await lockQueue(tx, businessId);
    const [t] = await tx
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.businessId, businessId)));
    if (!t) throw new QueueError("NOT_FOUND", "Ticket not found");
    if (!canTransition(t.status, to)) {
      throw new QueueError("BAD_TRANSITION", `Cannot move a ${t.status} ticket to ${to}`);
    }
    const patch: Partial<Ticket> = { status: to };
    if (to === "CALLED") patch.calledAt = now;
    if (to === "SERVED" || to === "SKIPPED" || to === "CANCELLED") patch.finishedAt = now;
    if (to === "WAITING") {
      // A recalled customer rejoins at the back of the line.
      patch.createdAt = now;
      patch.calledAt = null;
      patch.finishedAt = null;
    }
    const [updated] = await tx.update(tickets).set(patch).where(eq(tickets.id, t.id)).returning();
    await notifyQueueChanged(tx, businessId);
    return updated;
  });
}

/** Customer leaves the queue using the secret key in their link. */
export async function cancelByCustomer(db: DB, accessKey: string, now: Date = new Date()): Promise<Ticket> {
  const [t] = await db.select().from(tickets).where(eq(tickets.accessKey, accessKey));
  if (!t) throw new QueueError("NOT_FOUND", "Ticket not found");
  return setTicketStatus(db, t.businessId, t.id, "CANCELLED", now);
}

async function recentAverageMinutes(db: DB, biz: Business): Promise<number> {
  const served = await db
    .select({ calledAt: tickets.calledAt, finishedAt: tickets.finishedAt })
    .from(tickets)
    .where(
      and(
        eq(tickets.businessId, biz.id),
        eq(tickets.status, "SERVED"),
        isNotNull(tickets.calledAt),
        isNotNull(tickets.finishedAt),
      ),
    )
    .orderBy(desc(tickets.finishedAt))
    .limit(20);
  const durations = served.map((s) => s.finishedAt!.getTime() - s.calledAt!.getTime());
  return averageServiceMinutes(durations, biz.defaultMinutes);
}

export type QueueSnapshot = {
  business: Pick<Business, "id" | "name" | "slug" | "category" | "isOpen">;
  nowServing: Pick<Ticket, "id" | "number" | "customerName" | "calledAt">[];
  waiting: Pick<Ticket, "id" | "number" | "customerName" | "phone" | "createdAt">[];
  skipped: Pick<Ticket, "id" | "number" | "customerName">[];
  servedToday: number;
  avgMinutes: number;
};

/** Everything the staff dashboard and display board need, in one consistent read. */
export async function getQueueSnapshot(db: DB, businessId: string, now: Date = new Date()): Promise<QueueSnapshot> {
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  if (!biz) throw new QueueError("NOT_FOUND", "Queue not found");
  const day = serviceDateIST(now);

  const active = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.businessId, businessId),
        inArray(tickets.status, ["WAITING", "CALLED", "SKIPPED"]),
        eq(tickets.serviceDate, day),
      ),
    )
    .orderBy(asc(tickets.createdAt), asc(tickets.number));

  const [{ servedToday }] = await db
    .select({ servedToday: sql<number>`count(*)::int` })
    .from(tickets)
    .where(and(eq(tickets.businessId, businessId), eq(tickets.status, "SERVED"), eq(tickets.serviceDate, day)));

  return {
    business: { id: biz.id, name: biz.name, slug: biz.slug, category: biz.category, isOpen: biz.isOpen },
    nowServing: active
      .filter((t) => t.status === "CALLED")
      .map(({ id, number, customerName, calledAt }) => ({ id, number, customerName, calledAt })),
    waiting: active
      .filter((t) => t.status === "WAITING")
      .map(({ id, number, customerName, phone, createdAt }) => ({ id, number, customerName, phone, createdAt })),
    skipped: active
      .filter((t) => t.status === "SKIPPED")
      .map(({ id, number, customerName }) => ({ id, number, customerName })),
    servedToday,
    avgMinutes: await recentAverageMinutes(db, biz),
  };
}

export type TicketView = {
  number: number;
  status: TicketStatus;
  customerName: string;
  position: number;
  peopleAhead: number;
  etaMinutes: number;
  nowServing: number[];
  business: { id: string; name: string; slug: string };
};

/** What a customer sees on their phone. Contains no other customer's name or phone number. */
export async function getTicketView(db: DB, accessKey: string, now: Date = new Date()): Promise<TicketView | null> {
  const [t] = await db.select().from(tickets).where(eq(tickets.accessKey, accessKey));
  if (!t) return null;
  const snap = await getQueueSnapshot(db, t.businessId, now);
  const position = positionOf(t.id, snap.waiting.map((w) => w.id));
  return {
    number: t.number,
    status: t.status,
    customerName: t.customerName,
    position,
    peopleAhead: Math.max(0, position - 1),
    etaMinutes: t.status === "WAITING" ? estimateWaitMinutes(position, snap.avgMinutes, snap.nowServing.length > 0) : 0,
    nowServing: snap.nowServing.map((n) => n.number),
    business: { id: snap.business.id, name: snap.business.name, slug: snap.business.slug },
  };
}

export type PublicQueueInfo = {
  business: { id: string; name: string; slug: string; category: string; isOpen: boolean };
  waitingCount: number;
  etaMinutes: number;
  nowServing: number[];
};

/** Public numbers for the join page and display board (counts only, no customer details). */
export async function getPublicQueueInfo(db: DB, slug: string, now: Date = new Date()): Promise<PublicQueueInfo | null> {
  const [biz] = await db.select().from(businesses).where(eq(businesses.slug, slug));
  if (!biz) return null;
  const snap = await getQueueSnapshot(db, biz.id, now);
  return {
    business: snap.business,
    waitingCount: snap.waiting.length,
    etaMinutes: estimateWaitMinutes(snap.waiting.length + 1, snap.avgMinutes, snap.nowServing.length > 0),
    nowServing: snap.nowServing.map((n) => n.number),
  };
}
