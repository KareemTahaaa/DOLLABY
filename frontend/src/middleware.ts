import { NextRequest, NextResponse } from "next/server";

// All routes that require authentication
const PROTECTED_ROUTES = [
    "/dashboard",
    "/closet",
    "/outfits",
    "/calendar",
    "/try-on",
    "/assistant",
    "/settings",
];
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is protected
    const isProtected = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (isProtected) {
        // Read the token from the cookie set at login/signup
        const token = request.cookies.get("dollaby_token")?.value;

        if (!token) {
            // Redirect unauthenticated users to login
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}
export const config = {
    // Run middleware on all routes except Next.js internals and static files
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
