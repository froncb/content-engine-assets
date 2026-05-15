import type { AnalyticsSummary } from "@/lib/schema";

export function AnalyticsSummaryWidget({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary || summary.top_posts_14d.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-ink-800 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-2">
          Top posts — last 14 days
        </p>
        <p className="text-sm text-ink-400">Analytics pending first cycle.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-md border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">
          Top posts — last 14 days
        </p>
        {summary.last_analytics_run && (
          <p className="text-xs text-ink-500">
            Last analyzed{" "}
            {new Date(summary.last_analytics_run).toLocaleDateString("en-US", {
              timeZone: "America/Los_Angeles",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {summary.top_posts_14d.map((p, i) => (
          <div
            key={`${p.bundle_id}-${p.platform}-${i}`}
            className="rounded-md border border-ink-800 p-3"
          >
            <p className="text-xs uppercase tracking-wide text-ink-500 mb-1">{p.platform}</p>
            <p className="text-sm text-ink-100 mb-1 truncate" title={p.bundle_id}>
              {p.bundle_id}
            </p>
            {p.pillar && <p className="text-xs text-ink-400 mb-2">{p.pillar}</p>}
            <p className="text-lg text-accent font-semibold">{p.engagement_score}</p>
            {p.late_post_url && (
              <a
                href={p.late_post_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ink-500 hover:text-ink-300 underline"
              >
                view
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
