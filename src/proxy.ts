import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Optimistic auth check: bounce signed-out visitors away from /dashboard and signed-in
 * staff away from /login, without a database round trip. Real authorisation happens in
 * the Data Access Layer (src/lib/dal.ts).
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("ql_session")?.value;
  let signedIn = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ["HS256"] });
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard") && !signedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((pathname === "/login" || pathname === "/signup") && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/signup"] };
