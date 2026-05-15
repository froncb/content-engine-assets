import { SignOutButton } from "@clerk/nextjs";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-900 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl text-ink-50 font-semibold mb-3">Access denied</h1>
        <p className="text-sm text-ink-400 mb-6">
          This email is not on the allowlist for the PHNTM Asset Hub. If you believe this is an error, contact Franco.
        </p>
        <SignOutButton>
          <button className="px-4 py-2 text-xs uppercase tracking-[0.18em] text-ink-200 border border-ink-700 hover:bg-ink-800">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
