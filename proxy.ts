import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessPath, homePathFor } from "@/lib/permissions";
import { loadUser } from "@/lib/session";

// Route-level checks on permissions, never on role names. Pages and server
// actions check again on the object level.
export default auth(async (request) => {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") return;

  const userId = request.auth?.user?.id;
  const user = userId ? await loadUser(userId) : null;
  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl);
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(user, pathname)) {
    const home = homePathFor(user);
    if (home !== pathname) return NextResponse.redirect(new URL(home, request.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};
