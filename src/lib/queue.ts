import type { TicketStatus } from "../db/schema";

/**
 * Pure queue rules. No database or framework imports here, so every rule is unit-tested in isolation.
 */

/** Allowed status changes. SERVED and CANCELLED are terminal. */
const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  WAITING: ["CALLED", "SKIPPED", "CANCELLED"],
  CALLED: ["SERVED", "SKIPPED", "WAITING"],
  SKIPPED: ["WAITING"],
  SERVED: [],
  CANCELLED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Token shown to customers and on the display board, e.g. 7 -> "A-007". */
export function formatToken(n: number): string {
  return `A-${String(n).padStart(3, "0")}`;
}

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 20;

/**
 * Average service time in minutes from recent served tickets (durations in ms, newest first).
 * Uses the last 20 samples, drops the slowest and fastest 10% so one outlier doesn't skew
 * estimates, and falls back to the business default until there are 3 samples.
 */
export function averageServiceMinutes(durationsMs: number[], fallbackMinutes: number): number {
  const samples = durationsMs.filter((d) => Number.isFinite(d) && d > 0).slice(0, MAX_SAMPLES);
  if (samples.length < MIN_SAMPLES) return fallbackMinutes;
  const sorted = [...samples].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.1);
  const kept = sorted.slice(trim, sorted.length - trim);
  const meanMs = kept.reduce((sum, d) => sum + d, 0) / kept.length;
  const minutes = meanMs / 60_000;
  return Math.min(120, Math.max(1, Math.round(minutes * 10) / 10));
}

/**
 * Estimated minutes until a customer is called.
 * `position` is 1 for the next person in line. If someone is being served right now,
 * assume they are halfway through on average.
 */
export function estimateWaitMinutes(
  position: number,
  avgMinutes: number,
  someoneBeingServed: boolean,
): number {
  if (position <= 0) return 0;
  const ahead = position - 1;
  const current = someoneBeingServed ? avgMinutes / 2 : 0;
  return Math.ceil(ahead * avgMinutes + current);
}

/** 1-based position of a ticket among waiting tickets ordered oldest first; 0 if not waiting. */
export function positionOf(ticketId: string, waitingIdsInOrder: readonly string[]): number {
  return waitingIdsInOrder.indexOf(ticketId) + 1;
}

/**
 * The calendar date a ticket belongs to, in India Standard Time, as YYYY-MM-DD.
 * Token numbers restart at midnight IST, not midnight UTC.
 */
export function serviceDateIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/** URL slug from a business name: "Dr. Mehta's Clinic, Sec 15" -> "dr-mehtas-clinic-sec-15". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Normalises an Indian mobile number to +91XXXXXXXXXX, or returns null if it isn't one. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (local.length === 11 && local.startsWith("0")) return normalizeIndianPhone(local.slice(1));
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}
