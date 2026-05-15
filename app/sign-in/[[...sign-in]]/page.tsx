import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-900 p-6">
      <SignIn appearance={{ elements: { card: "bg-ink-800 border border-ink-700" } }} />
    </main>
  );
}
