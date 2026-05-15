import { notFound, redirect } from "next/navigation";
import { Film, FileText } from "lucide-react";
import { Header } from "@/components/header";
import { FilmingScriptViewer } from "@/components/filming-script-viewer";
import { UploadZone } from "@/components/upload-zone";
import { findBundle, isoMonday, loadCalendar, dayName, todayInPT } from "@/lib/calendar";
import { getFootageStatus } from "@/lib/footage";
import { loadBundleStatus } from "@/lib/status";
import { PlatformBadge } from "@/components/platform-badge";
import { QualityGateAccordion } from "@/components/quality-gate-accordion";
import type { Bundle, BundleStatus } from "@/lib/schema";

export const dynamic = "force-dynamic";

function getCompanies(): string[] {
  return (process.env.COMPANIES || "promptperfect")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

async function findBundleAcrossWeeks(
  company: string,
  weeks: Iterable<string>,
  id: string,
): Promise<{ bundle: Bundle; weekStart: string } | null> {
  for (const ws of weeks) {
    try {
      const cal = await loadCalendar(company, ws);
      if (!cal) continue;
      const b = findBundle(cal, id);
      if (b) return { bundle: b, weekStart: ws };
    } catch {
      // schema mismatch on this week — keep looking
    }
  }
  return null;
}

async function safeLoadStatus(
  company: string,
  id: string,
): Promise<{ status: BundleStatus | null; error: string | null }> {
  try {
    const status = await loadBundleStatus(company, id);
    return { status, error: null };
  } catch (e) {
    return { status: null, error: e instanceof Error ? e.message : String(e) };
  }
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

  // Calendar lookup and status load run independently — either can be missing.
  // Hard-404 only when BOTH the calendar entry AND the status.json are absent.
  const [bundleAndWeek, statusResult] = await Promise.all([
    findBundleAcrossWeeks(company, candidateWeeks, id),
    safeLoadStatus(company, id),
  ]);

  const bundle = bundleAndWeek?.bundle ?? null;
  const weekStart = bundleAndWeek?.weekStart ?? null;
  const { status: bundleStatus, error: statusError } = statusResult;

  if (!bundle && !bundleStatus && !statusError) notFound();

  // Orphan path: status.json exists on R2 but no candidate week's calendar
  // contains this bundle. Likely a pre-rotation bundle still addressable by
  // direct URL.
  if (!bundle) {
    return (
      <OrphanBundleView
        company={company}
        id={id}
        status={bundleStatus}
        statusError={statusError}
        idDate={idDateMatch?.[1] ?? null}
      />
    );
  }

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

          {/* Bundle status — from R2 status.json, populated by engine post-/run-daily */}
          <StatusSection status={bundleStatus} error={statusError} variant="bundle-present" />

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

function OrphanBundleView({
  company,
  id,
  status,
  statusError,
  idDate,
}: {
  company: string;
  id: string;
  status: BundleStatus | null;
  statusError: string | null;
  idDate: string | null;
}) {
  return (
    <>
      <Header
        company={company}
        crumb={[{ label: "orphan" }, { label: id }]}
      />
      <main className="min-h-screen bg-ink-900 px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Minimal header — only what we can derive without the calendar entry */}
          <section>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
              {idDate ? (
                <span>
                  {dayName(idDate)} · {idDate}
                </span>
              ) : null}
              {status ? (
                <>
                  <span className="text-ink-600">·</span>
                  <span>{status.stage}</span>
                </>
              ) : null}
            </div>
            <h1 className="text-2xl text-ink-50 font-semibold tracking-tight leading-tight break-all">
              {id}
            </h1>
          </section>

          {/* Orphan note */}
          <section>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium mb-1">Calendar entry not in active R2 weeks</p>
              <p className="text-xs text-amber-200/80">
                This bundle may be from a rotated week. Status data below is from
                R2 <code>status.json</code> directly — calendar-derived fields
                (summary, filming script, mediums) aren&apos;t available.
              </p>
            </div>
          </section>

          {/* Bundle status */}
          <StatusSection status={status} error={statusError} variant="orphan" />
        </div>
      </main>
    </>
  );
}

function StatusSection({
  status,
  error,
  variant,
}: {
  status: BundleStatus | null;
  error: string | null;
  variant: "bundle-present" | "orphan";
}) {
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">bundle status</p>
      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          <p className="font-medium mb-1">Couldn&apos;t load status</p>
          <p className="text-xs text-red-300/80 break-words">{error}</p>
        </div>
      ) : !status ? (
        <p className="text-sm text-ink-400">
          {variant === "orphan"
            ? "No status.json on R2 for this bundle id either."
            : (
              <>
                Status not yet published to R2 for this bundle. After the next{" "}
                <code>/run-daily</code> for this date, the engine will push
                status.json and it will appear here.
              </>
            )}
        </p>
      ) : (
        <>
          <div className="rounded-md border border-ink-800 px-4 py-2">
            {(
              Object.entries(status.platforms) as Array<
                [
                  keyof typeof status.platforms,
                  (typeof status.platforms)[keyof typeof status.platforms],
                ]
              >
            ).map(([platform, p]) => (
              <PlatformBadge
                key={platform}
                platform={platform}
                state={p.state}
                latePostId={p.late_post_id}
                scheduledFor={p.scheduled_for}
                error={p.error}
              />
            ))}
          </div>

          <div className="mt-4 text-xs text-ink-500">
            <span>
              Stage: <span className="text-ink-200">{status.stage}</span>
            </span>
            {status.reel_source && (
              <span className="ml-4">
                Reel source:{" "}
                <span className="text-ink-200">{status.reel_source}</span>
              </span>
            )}
            {status.warnings.length > 0 && (
              <div className="mt-2 text-amber-300">
                {status.warnings.map((w, i) => (
                  <p key={i}>⚠ {w}</p>
                ))}
              </div>
            )}
          </div>

          <QualityGateAccordion gates={status.quality_gates} />
        </>
      )}
    </section>
  );
}
