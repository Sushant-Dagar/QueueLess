import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";

/** Printable QR code (SVG) that opens this business's join page. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const [biz] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug));
  if (!biz) return new Response("Not found", { status: 404 });
  const origin = process.env.PUBLIC_URL ?? new URL(req.url).origin;
  const svg = await QRCode.toString(`${origin}/q/${slug}`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#17323a", light: "#ffffff" },
  });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  });
}
