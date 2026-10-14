import { db } from "@/db";
import { getTicketView } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const view = await getTicketView(db, key);
  if (!view) return Response.json({ error: "Ticket not found" }, { status: 404 });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
