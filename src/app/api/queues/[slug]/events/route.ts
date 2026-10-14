import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for one queue. It only says "something changed"; clients then
 * fetch the view they are allowed to see (public counts, their own ticket, or the staff list).
 * That way no customer data ever travels on the shared public stream.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const [biz] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug));
  if (!biz) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      // Coalesce bursts (e.g. "serve + call next" in one click) into one client refresh.
      let pending: ReturnType<typeof setTimeout> | null = null;
      const unsubscribe = await subscribe(biz.id, () => {
        if (pending) return;
        pending = setTimeout(() => {
          pending = null;
          send(`event: change\ndata: ${Date.now()}\n\n`);
        }, 150);
      });
      // Comment pings keep proxies (Render, Nginx) from closing an idle connection.
      const ping = setInterval(() => send(`: ping\n\n`), 25_000);
      cleanup = () => {
        clearInterval(ping);
        if (pending) clearTimeout(pending);
        unsubscribe();
      };
      send(`retry: 3000\nevent: ready\ndata: ok\n\n`);
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
