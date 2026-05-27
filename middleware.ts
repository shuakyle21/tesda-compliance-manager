import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

function getSignInUrl(request: Request) {
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("reason", "auth-required");
  return signInUrl.toString();
}

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  auth().protect({ unauthenticatedUrl: getSignInUrl(request) });
});

export const config = {
  // Match all app routes while skipping Next.js internals and file assets.
  matcher: ["/((?!_next|.*\\..*).*)", "/"],
};
