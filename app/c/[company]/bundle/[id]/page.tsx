import { notFound, redirect } from "next/navigation";
import { Film, FileText } from "lucide-react";
import { Header } from "@/components/header";
import { FilmingScriptViewer } from "@/components/filming-script-viewer";
import { UploadZone } from "@/components/upload-zone";
import { findBundle, isoMonday, loadCalendar, dayName, todayInPT } from "@/lib/calendar";
import { getFootageStatus } from "@/lib/footage";

export const dynamic = "force-dynamic";

function getCompanies(): string[] {
  return (process.env.COMPANIES || "promptperfect")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export default async function BundleDetailPage({
  params,
}: {
  params: { company: string; id: string };
}) {
  const { company, id } = params;
  if (!getCompanies().includes(company)) redirect("/companies");

  // Bundle ids are date-prefixed: 2026-05-18-slug. Try the ISO Monday of the
  // bundle's own date first; fall back to current week.
  const idDateMatch = id.match(/^(\d{4}-\d{2}-\d{2})/);
  const candidateWeeks = new Set<string>();
  if (idDateMatch) candidateWeeks.add(isoMonday(idDateMatch[1]));
  candidateWeeks.add(isoMonday(todayInPT()));

  let bundle = null;
  let weekStart: string | null = null;
  for (const ws of candidateWeeks) {
    try {
      const cal = await loadCalendar(company, ws);
      if (!cal) continue;
      const b = findBundle(cal, id);
      if (b) {
        bundle = b;
        weekStart = ws;
        break;
      }
    } catch {
      // schema mismatch — surface as 404 for now; the company home shows the error.
    }
  }

  if (!bundle || !weekStart) notFound();

  const footage = bundle.needs_reel
    ? await getFootageStatus(company, bundle.id)
    : { uploaded: false, ext: null, publicUrl: null };

  const scheduledForLabel = `${dayName(bundle.date)} ${bundle.date} at ${bundle.target_time}`;

  return (
    <>
      <Header
        company={company}
        crumb={[
          { label: `week of ${weekStart}`, href: `/c/${company}` },
          { label: bundle.id },
        ]}
      />
      <main className="min-h-screen bg-ink-900 px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header card */}
          <section>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
              <span>{dayName(bundle.date)} · {bundle.date}</span>
              <span className="text-ink-600">·</span>
              <span>{bundle.target_time}</span>
              <span className="text-ink-600">·</span>
              <span>{bundle.pillar}</span>
              <span className="text-ink-600">·</span>
              <span>{bundle.funnel_stage.toUpperCase()}</span>
              <span className="text-ink-600">·</span>
              <span>{bundle.hook_hint}</span>
            </div>
            <h1 className="text-2xl text-ink-50 font-semibold tracking-tight leading-tight">
              {bundle.sub_topic}
            </h1>
            <p className="text-sm text-ink-400 mt-2 leading-relaxed">{bundle.angle}</p>
          </section>

          {/* Summary */}
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">summary</p>
            <p className="text-lg text-ink-100 leading-relaxed font-serif">
              {bundle.summary}
            </p>
          </section>

          {/* Reel decision */}
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
              reel decision
            </p>
            {bundle.needs_reel ? (
              <div className="rounded-md border border-accent/30 bg-accent/5 px-5 py-4 flex items-start gap-3">
                <Film className="text-accent shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-ink-50 font-medium">Reel planned for this bundle</p>
                  <p className="text-xs text-ink-300 mt-1">
                    Concept benefits from motion. Filming script below; upload your clip when ready.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-ink-800 bg-ink-900 px-5 py-4 flex items-start gap-3">
                <FileText className="text-ink-300 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-ink-50 font-medium">No reel for this bundle</p>
                  <p className="text-xs text-ink-400 mt-1">
                    Ships as carousel + LinkedIn post + tweet only — the concept reads
                    better as text/slides than as motion.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Filming script — only when needs_reel */}
          {bundle.needs_reel && bundle.filming_script ? (
            <section>
              <FilmingScriptViewer script={bundle.filming_script} />
            </section>
          ) : null}

          {/* Upload zone — only when needs_reel */}
          {bundle.needs_reel ? (
            <section>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
                upload footage
              </p>
              <UploadZone
                company={company}
                bundleId={bundle.id}
                scheduledFor={scheduledForLabel}
                existing={
                  footage.uploaded && footage.ext && footage.publicUrl
                    ? { uploaded: true, ext: footage.ext, publicUrl: footage.publicUrl }
                    : { uploaded: false }
                }
              />
            </section>
          ) : null}

          {/* Bundle mediums */}
          <section>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">shipping</p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["reel", "carousel", "linkedin", "twitter"] as const).map((m) => {
                const active = bundle!.active_mediums.includes(m);
                return (
                  <li
                    key={m}
                    className={
                      active
                        ? "rounded-md border border-ink-700 bg-ink-800/60 px-3 py-2 text-sm text-ink-100"
                        : "rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-500 line-through"
                    }
                  >
                    {m}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="border-t border-ink-800 pt-6">
            <p className="text-xs text-ink-500">
              <span className="text-ink-400">rationale: </span>
              {bundle.rationale}
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
