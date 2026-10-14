import { db } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { getQueueSnapshot } from "@/lib/tickets";

export const dynamic = "force-dynamic";

/** Full queue (names, phone numbers) for signed-in staff of this business only. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await getQueueSnapshot(db, user.businessId);
  return Response.json(snap, { headers: { "Cache-Control": "no-store" } });
}
