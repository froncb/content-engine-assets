type State = "pending" | "scheduled" | "posted" | "failed" | "skipped";

const COLOR: Record<State, string> = {
  pending: "bg-ink-700 text-ink-300",
  scheduled: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  posted: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border border-red-500/30",
  skipped: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
};

const LABEL: Record<string, string> = {
  instagram_carousel: "IG Carousel",
  tiktok_carousel: "TikTok Carousel",
  instagram_reel: "IG Reel",
  tiktok_video: "TikTok Video",
  linkedin: "LinkedIn",
  twitter: "Twitter",
};

export function PlatformBadge({
  platform,
  state,
  latePostId,
  scheduledFor,
  error,
}: {
  platform: string;
  state: State;
  latePostId: string | null;
  scheduledFor: string | null;
  error: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ink-800 last:border-b-0">
      <div className="text-sm text-ink-200">{LABEL[platform] ?? platform}</div>
      <div className="flex items-center gap-3">
        {scheduledFor && (
          <span className="text-xs text-ink-500">
            {new Date(scheduledFor).toLocaleString("en-US", {
              timeZone: "America/Los_Angeles",
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            })}{" "}
            PT
          </span>
        )}
        {latePostId && <code className="text-xs text-ink-400">{latePostId}</code>}
        <span className={`text-xs px-2 py-1 rounded-md uppercase tracking-wide ${COLOR[state]}`}>
          {state}
        </span>
        {error && (
          <span className="text-xs text-red-300 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
