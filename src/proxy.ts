import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

// Route protection rules: path prefix → allowed roles (no roles = any authenticated user)
const PROTECTED: { prefix: string; roles?: string[] }[] = [
  { prefix: "/admin",                roles: ["admin"] },
  { prefix: "/seller-dashboard",     roles: ["seller"] },
  { prefix: "/buyer-dashboard",      roles: ["buyer"] },
  { prefix: "/hub-manager",          roles: ["hub_manager"] },
  { prefix: "/qc-leader",            roles: ["qc_leader"] },
  { prefix: "/qc-checker",           roles: ["qc_checker"] },
  { prefix: "/delivery-hub",         roles: ["delivery_hub_manager"] },
  { prefix: "/delivery-distributor", roles: ["delivery_distributor"] },
  { prefix: "/aroth-dashboard",      roles: ["aroth"] },
  { prefix: "/running-bids",         roles: ["buyer"] },
  { prefix: "/marketplace" },      // any logged-in user
  { prefix: "/live" },             // any logged-in user
  { prefix: "/delivery-receipt" }, // any logged-in user
];

// Paths that redirect to dashboard if already logged in
const AUTH_PATHS = ["/auth/signin", "/auth/signup", "/auth/forgot"];

// Default dashboard per role
const ROLE_DASHBOARDS: Record<string, string> = {
  admin:                "/admin",
  seller:               "/seller-dashboard",
  buyer:                "/buyer-dashboard",
  hub_manager:          "/hub-manager",
  qc_leader:            "/qc-leader",
  qc_checker:           "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
  aroth:                "/aroth-dashboard",
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verify JWT from httpOnly cookie
  const session = await getSessionFromRequest(request);
  const isLoggedIn = !!session;
  const activeRole = session?.activeRole ? session.activeRole.toLowerCase() : null;

  // Redirect authenticated users away from auth pages and the landing page
  if (isLoggedIn) {
    const dest = activeRole ? (ROLE_DASHBOARDS[activeRole] ?? "/") : "/";
    if (AUTH_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/") {
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // Check protected routes
  for (const rule of PROTECTED) {
    if (pathname.startsWith(rule.prefix)) {
      if (!isLoggedIn) {
        const loginUrl = new URL("/auth/signin", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (rule.roles && activeRole && !rule.roles.includes(activeRole)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/seller-dashboard/:path*",
    "/buyer-dashboard/:path*",
    "/hub-manager/:path*",
    "/qc-leader/:path*",
    "/qc-checker/:path*",
    "/delivery-hub/:path*",
    "/delivery-distributor/:path*",
    "/running-bids/:path*",
    "/marketplace/:path*",
    "/live/:path*",
    "/delivery-receipt/:path*",
    "/auth/:path*",
  ],
};
