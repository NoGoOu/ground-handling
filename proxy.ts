import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { canAccessPath, homePathFor } from "@/lib/permissions";

// Optimistic, route-level checks only. Pages and server actions check again on the server.
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") return;

  const role = request.auth?.user?.role;
  if (!role) {
    const loginUrl = new URL("/login", request.nextUrl);
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(homePathFor(role), request.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};
