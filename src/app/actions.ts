"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { businesses, users, type TicketStatus } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { requireUser } from "@/lib/dal";
import { LANG_COOKIE, isLang } from "@/lib/i18n";
import { normalizeIndianPhone, slugify } from "@/lib/queue";
import { RateLimiter } from "@/lib/rate-limit";
import { QueueError, callNext, cancelByCustomer, joinQueue, setTicketStatus } from "@/lib/tickets";
import { notifyQueueChanged } from "@/lib/realtime";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

// ---------- Auth ----------

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  businessName: z.string().trim().min(2, "Enter your business name").max(60),
  category: z.enum(["Clinic", "Salon", "Bank / Office", "Restaurant", "Other"]),
});

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "queue";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [taken] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, candidate));
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = SignupSchema.safeParse(raw);
  const fields = { ...raw };
  delete fields.password; // never echo a password back to the form
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const data = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email));
  if (existing) return { error: "An account with this email already exists. Log in instead.", fields };

  const passwordHash = await bcrypt.hash(data.password, 12);
  const slug = await uniqueSlug(data.businessName);
  const user = await db.transaction(async (tx) => {
    const [biz] = await tx
      .insert(businesses)
      .values({ name: data.businessName, slug, category: data.category })
      .returning();
    const [u] = await tx
      .insert(users)
      .values({ name: data.name, email: data.email, passwordHash, role: "OWNER", businessId: biz.id })
      .returning();
    return u;
  });

  await createSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/dashboard");
}

const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);
let dummyHash: string | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();
  if (!loginLimiter.check(`${ip}:${email}`).ok) {
    return { error: "Too many attempts. Try again in 15 minutes.", fields: { email } };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Compare against a dummy hash when the user doesn't exist, so response time doesn't reveal which emails are registered.
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) return { error: "Email or password is incorrect.", fields: { email } };
  await createSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// ---------- Customer actions ----------

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

const joinLimiter = new RateLimiter(5, 10 * 60 * 1000);

const JoinSchema = z.object({
  customerName: z.string().trim().min(1, "Enter your name").max(40, "Keep your name under 40 characters"),
  phone: z.string().trim().max(20).optional(),
});

export async function joinQueueAction(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const fields = { customerName: String(formData.get("customerName") ?? ""), phone: String(formData.get("phone") ?? "") };
  const parsed = JoinSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizeIndianPhone(parsed.data.phone);
    if (!phone) return { error: "Enter a 10-digit Indian mobile number, or leave it blank.", fields };
  }

  const limit = joinLimiter.check(`${await clientIp()}:${slug}`);
  if (!limit.ok) return { error: `Too many tokens from this device. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.`, fields };

  const [biz] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug));
  if (!biz) return { error: "This queue doesn't exist.", fields };

  let accessKey: string;
  try {
    const ticket = await joinQueue(db, biz.id, { customerName: parsed.data.customerName, phone });
    accessKey = ticket.accessKey;
  } catch (e) {
    if (e instanceof QueueError) return { error: e.message, fields };
    throw e;
  }
  redirect(`/t/${accessKey}`);
}

export async function leaveQueueAction(accessKey: string) {
  try {
    await cancelByCustomer(db, accessKey);
  } catch (e) {
    if (!(e instanceof QueueError)) throw e;
  }
}

export async function setLangAction(lang: string) {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

// ---------- Staff actions (always re-checked against the session) ----------

export async function callNextAction() {
  const user = await requireUser();
  await callNext(db, user.businessId);
}

const STAFF_MOVES: TicketStatus[] = ["SERVED", "SKIPPED", "WAITING", "CALLED"];

export async function setTicketStatusAction(ticketId: string, to: TicketStatus) {
  const user = await requireUser();
  if (!STAFF_MOVES.includes(to)) return { error: "Not allowed" };
  try {
    // businessId comes from the session, so staff can only ever touch their own queue.
    await setTicketStatus(db, user.businessId, ticketId, to);
    return {};
  } catch (e) {
    if (e instanceof QueueError) return { error: e.message };
    throw e;
  }
}

export async function toggleOpenAction(open: boolean) {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    await tx.update(businesses).set({ isOpen: open }).where(eq(businesses.id, user.businessId));
    await notifyQueueChanged(tx, user.businessId);
  });
}

