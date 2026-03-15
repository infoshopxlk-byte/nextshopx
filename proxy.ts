import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export const proxy = withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // Safety check: If we are already on a page that doesn't need auth, just continue
    if (pathname.startsWith('/account') || pathname.startsWith('/login') || pathname.startsWith('/seller/login')) {
        return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/account",
    },
  }
);

export const config = {
  // MANUAL OVERRIDE: Completely disable proxy for diagnostic purposes
  matcher: [],
};
