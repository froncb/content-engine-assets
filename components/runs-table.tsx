"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { RunsIndex, RunsIndexEntry } from "@/lib/schema";

type Props = { company: string; index: RunsIndex };

const STAGES = ["all", "PRODUCED", "PUBLISHED", "MONITORED", "CLOSED", "FAILED"] as const;
type StageFilter = (typeof STAGES)[number];

const STAGE_COLOR: Record<string, string> = {
  PRODUCED: "text-ink-300",
  PUBLISHED: "text-amber-300",
  MONITORED: "text-emerald-300",
  CLOSED: "text-ink-500",
  FAILED: "text-red-300",
};

export function RunsTable({ company, index }: Props) {
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const rows = useMemo(() => {
    const list = [...index.runs];
    list.sort((a, b) => b.date.localeCompare(a.date));
    return stageFilter === "all" ? list : list.filter((r) => r.stage === stageFilter);
  }, [index, stageFilter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`text-xs px-3 py-1 rounded-md ${
              stageFilter === s
                ? "bg-accent text-ink-900"
                : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.18em] text-ink-500 border-b border-ink-800">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Bundle</th>
            <th className="text-left py-2">Pillar</th>
            <th className="text-left py-2">Stage</th>
            <th className="text-left py-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: RunsIndexEntry) => (
            <tr key={r.bundle_id} className="border-b border-ink-800/50 hover:bg-ink-800/30">
              <td className="py-2 text-ink-300">{r.date}</td>
              <td className="py-2">
                <Link
                  href={`/c/${company}/bundle/${r.bundle_id}`}
                  className="text-ink-100 hover:text-accent"
                >
                  {r.bundle_id}
                </Link>
              </td>
              <td className="py-2 text-ink-400">{r.pillar ?? "—"}</td>
              <td className={`py-2 ${STAGE_COLOR[r.stage] ?? "text-ink-300"}`}>{r.stage}</td>
              <td className="py-2 text-ink-500 text-xs">{r.last_updated ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-ink-500 text-sm">
                No runs match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
