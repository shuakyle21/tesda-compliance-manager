import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const message =
    resolvedSearchParams?.reason === "auth-required"
      ? "Please sign in to continue."
      : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-6">
      {message ? <p className="text-sm text--color-text-secondary">{message}</p> : null}
      <SignIn routing="path" path="/sign-in" redirectUrl="/" />
    </div>
  );
}
