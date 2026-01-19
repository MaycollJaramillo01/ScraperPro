import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface SessionData {
  email: string;
  role: string;
  exp: number;
}

function getSession(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get("session");
  
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as SessionData;
    
    // Check if session is expired
    if (session.exp < Date.now()) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth/login"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If accessing a public route, allow it
  if (isPublicRoute) {
    return response;
  }

  // Check session
  const session = getSession(request);

  // If no session and trying to access protected route, redirect to login
  if (!session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For admin routes, check if user is admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (except auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/(?!auth)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
