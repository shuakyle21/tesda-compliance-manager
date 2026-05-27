import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  auth().protect({ unauthenticatedUrl: "/sign-in" });
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/"],
};
