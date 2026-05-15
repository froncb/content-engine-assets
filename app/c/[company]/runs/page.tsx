import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { RunsTable } from "@/components/runs-table";
import { loadRunsIndex } from "@/lib/status";

export const dynamic = "force-dynamic";

function getCompanies(): string[] {
  return (process.env.COMPANIES || "promptperfect")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export default async function RunsPage({ params }: { params: { company: string } }) {
  const { company } = params;
  if (!getCompanies().includes(company)) redirect("/companies");

  let index = null;
  let error: string | null = null;
  try {
    index = await loadRunsIndex(company);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <Header company={company} crumb={[{ label: "runs" }]} />
      <main className="min-h-screen bg-ink-900 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h1 className="text-2xl text-ink-50 font-semibold tracking-tight">Run history</h1>
            <Link
              href={`/c/${company}`}
              className="text-xs text-ink-400 hover:text-ink-200"
            >
              ← back to bundles
            </Link>
          </div>

          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-3 mb-6 text-sm text-red-300">
              <p className="font-medium mb-1">Couldn&apos;t load run history.</p>
              <p className="text-xs text-red-300/80 break-words">{error}</p>
            </div>
          ) : !index ? (
            <p className="text-sm text-ink-400">
              No runs-index.json on R2 yet. After the next <code>/run-daily</code>, runs
              will appear here.
            </p>
          ) : (
            <RunsTable company={company} index={index} />
          )}
        </div>
      </main>
    </>
  );
}
