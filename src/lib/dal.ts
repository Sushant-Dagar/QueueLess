import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, businesses } from "../db/schema";
import { readSession } from "./session";

/**
 * Data Access Layer: the single place that turns a session cookie into a verified user.
 * The proxy only does a fast optimistic check; every page and API route that touches
 * business data calls this, so authorisation never depends on the proxy alone.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      businessId: users.businessId,
      businessName: businesses.name,
      businessSlug: businesses.slug,
    })
    .from(users)
    .innerJoin(businesses, eq(users.businessId, businesses.id))
    .where(eq(users.id, session.userId));
  return row ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
