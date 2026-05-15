import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware enforces auth + allowlist before this runs.
  redirect("/companies");
}
