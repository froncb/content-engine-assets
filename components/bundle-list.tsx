import Link from "next/link";
import { Film, FileText, Clock } from "lucide-react";
import type { Bundle } from "@/lib/schema";
import { dayName } from "@/lib/calendar";
import { cn } from "@/lib/cn";

export function BundleList({
  company,
  bundles,
}: {
  company: string;
  bundles: Bundle[];
}) {
  if (bundles.length === 0) {
    return (
      <p className="text-sm text-ink-400 py-8">
        No bundles for this week. Run <code className="text-accent">/plan-week</code> on the
        content engine to populate.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {bundles.map((b) => (
        <li key={b.id}>
          <Link
            href={`/c/${company}/bundle/${b.id}`}
            className={cn(
              "group block rounded-md border border-ink-800 bg-ink-900 px-5 py-4",
              "hover:border-ink-700 hover:bg-ink-800/60 transition-colors",
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-ink-400 mb-1">
                  <span className="uppercase tracking-[0.14em]">
                    {dayName(b.date)} · {b.date}
                  </span>
                  <span className="text-ink-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {b.target_time}
                  </span>
                  <span className="text-ink-600">·</span>
                  <span className="text-ink-500">
                    {b.pillar} · {b.funnel_stage.toUpperCase()}
                  </span>
                </div>
                <p className="text-ink-50 font-medium leading-snug">{b.summary}</p>
                <p className="text-xs text-ink-500 mt-2 truncate">{b.sub_topic}</p>
              </div>
              <ReelChip needsReel={b.needs_reel} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ReelChip({ needsReel }: { needsReel: boolean }) {
  if (needsReel) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-accent/15 text-accent px-2.5 py-1 text-xs font-medium">
        <Film size={12} />
        needs reel
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-ink-800 text-ink-300 px-2.5 py-1 text-xs">
      <FileText size={12} />
      text only
    </span>
  );
}
