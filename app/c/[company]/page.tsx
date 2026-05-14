import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { BundleList } from "@/components/bundle-list";
import { loadCurrentWeekCalendar } from "@/lib/calendar";

export const dynamic = "force-dynamic";

function getCompanies(): string[] {
  const raw = process.env.COMPANIES || "promptperfect";
  return raw.split(",").map((c) => c.trim()).filter(Boolean);
}

export default async function CompanyHomePage({
  params,
}: {
  params: { company: string };
}) {
  const { company } = params;
  if (!getCompanies().includes(company)) {
    redirect("/companies");
  }

  let weekStart = "";
  let calendar = null;
  let error: string | null = null;
  try {
    const r = await loadCurrentWeekCalendar(company);
    weekStart = r.weekStart;
    calendar = r.calendar;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const reelCount = calendar?.bundles.filter((b) => b.needs_reel).length ?? 0;
  const total = calendar?.bundles.length ?? 0;

  return (
    <>
      <Header company={company} />
      <main className="min-h-screen bg-ink-900 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400">
              week of {weekStart || "—"}
            </p>
            <Link
              href="/companies"
              className="text-xs text-ink-400 hover:text-ink-200 transition-colors"
            >
              switch company
            </Link>
          </div>
          <h1 className="text-3xl text-ink-50 font-semibold tracking-tight mb-1">
            {company}
          </h1>
          {calendar ? (
            <p className="text-sm text-ink-400 mb-8">
              <span className="text-ink-200">{total}</span> bundles ·{" "}
              <span className="text-accent">{reelCount}</span>{" "}
              {reelCount === 1 ? "reel" : "reels"} to film this week
              {calendar.approved === false ? (
                <span className="ml-2 text-amber-400">· awaiting approval</span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-ink-400 mb-8">
              No calendar in R2 for week of {weekStart}.
            </p>
          )}

          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-3 mb-6 text-sm text-red-300">
              <p className="font-medium mb-1">Couldn&apos;t parse the calendar.</p>
              <p className="text-xs text-red-300/80 break-words">{error}</p>
            </div>
          ) : null}

          {calendar ? (
            <BundleList company={company} bundles={calendar.bundles} />
          ) : (
            <EmptyState weekStart={weekStart} />
          )}
        </div>
      </main>
    </>
  );
}

function EmptyState({ weekStart }: { weekStart: string }) {
  return (
    <div className="rounded-md border border-ink-800 bg-ink-900 px-6 py-10 text-center">
      <p className="text-sm text-ink-200 mb-2">No calendar uploaded yet</p>
      <p className="text-xs text-ink-500">
        Run <code className="text-accent">/plan-week</code> on the content engine to plan
        and approve the week of {weekStart}. Once approved, the calendar mirrors to R2
        automatically and shows up here.
      </p>
    </div>
  );
}
