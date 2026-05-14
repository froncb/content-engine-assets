import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import PasswordGate from "./_components/password-gate";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (isAuthenticated()) {
    redirect(searchParams.next || "/companies");
  }
  return <PasswordGate nextPath={searchParams.next || "/companies"} />;
}
