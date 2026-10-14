import { db } from "@/db";
import { getPublicQueueInfo } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const info = await getPublicQueueInfo(db, slug);
  if (!info) return Response.json({ error: "Queue not found" }, { status: 404 });
  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
}
