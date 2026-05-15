import "server-only";
import { getJson } from "@/lib/r2";
import {
  RunsIndexSchema,
  type RunsIndex,
  BundleStatusSchema,
  type BundleStatus,
  AnalyticsSummarySchema,
  type AnalyticsSummary,
} from "@/lib/schema";

export async function loadRunsIndex(company: string): Promise<RunsIndex | null> {
  const raw = await getJson(`${company}/state/runs-index.json`);
  if (!raw) return null;
  const parsed = RunsIndexSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `runs-index.json schema mismatch for ${company}: ` +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return parsed.data;
}

export async function loadBundleStatus(
  company: string,
  bundleId: string,
): Promise<BundleStatus | null> {
  const raw = await getJson(`${company}/runs/${bundleId}/status.json`);
  if (!raw) return null;
  const parsed = BundleStatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `status.json schema mismatch for ${company}/${bundleId}: ` +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return parsed.data;
}

export async function loadAnalyticsSummary(
  company: string,
): Promise<AnalyticsSummary | null> {
  const state = await getJson<{
    performance_insights?: { top_posts_14d?: unknown };
    last_analytics_run?: string;
  }>(`${company}/state/state.json`);
  if (!state) return null;

  const summary = {
    last_analytics_run: state.last_analytics_run ?? null,
    top_posts_14d: state.performance_insights?.top_posts_14d ?? [],
  };
  const parsed = AnalyticsSummarySchema.safeParse(summary);
  if (!parsed.success) {
    throw new Error(
      `analytics summary schema mismatch for ${company}: ` +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return parsed.data;
}
