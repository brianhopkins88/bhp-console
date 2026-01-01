import { NextRequest, NextResponse } from "next/server";

const BASIC_PREFIX = "Basic ";

const unauthorizedResponse = () =>
  new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
    },
  });

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_BASIC_AUTH_USER;
  const password = process.env.ADMIN_BASIC_AUTH_PASS;

  if (!username || !password) {
    return new NextResponse("Admin auth not configured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith(BASIC_PREFIX)) {
    return unauthorizedResponse();
  }

  let decoded = "";
  try {
    decoded = atob(authHeader.slice(BASIC_PREFIX.length));
  } catch {
    return unauthorizedResponse();
  }

  const [user, pass] = decoded.split(":");
  if (user !== username || pass !== password) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
