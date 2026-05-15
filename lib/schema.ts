import { z } from "zod";

/**
 * Mirror of the content-engine planner.md output contract (post-2026-05-14
 * filmed-footage workflow Phase 1). Hub parses content-calendar.json read
 * from R2 — any drift between engine and hub schemas surfaces here.
 */

export const FunnelStage = z.enum(["tofu", "mofu", "bofu"]);

export const ContentType = z.enum([
  "framework",
  "news",
  "case-study",
  "opinion",
  "tutorial",
  "comparison",
]);

export const HeroMedium = z.enum(["reel", "carousel", "linkedin", "twitter"]);

export const Medium = z.enum(["reel", "carousel", "linkedin", "twitter"]);

export const BundleSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_time: z.string().min(1),
  pillar: z.string().min(1),
  sub_topic: z.string().min(1),
  angle: z.string().min(1),
  funnel_stage: FunnelStage,
  content_type: ContentType,
  hook_hint: z.string().min(1),
  hero_medium: HeroMedium,
  active_mediums: z.array(Medium).min(1),
  needs_reel: z.boolean(),
  summary: z.string().min(1),
  filming_script: z.string().nullable(),
  rationale: z.string().min(1),
});

export type Bundle = z.infer<typeof BundleSchema>;

export const ContentCalendarSchema = z
  .object({
    week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    week_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    company: z.string().min(1),
    bundles_per_week: z.number().int().positive(),
    generated_at: z.string().optional(),
    approved: z.boolean().optional(),
    cadence_snapshot: z.record(z.array(z.string())).optional(),
    total_bundles: z.number().int().optional(),
    bundles: z.array(BundleSchema),
  })
  .refine((c) => c.bundles.length === c.bundles_per_week, {
    message: "bundles.length must match bundles_per_week",
  });

export type ContentCalendar = z.infer<typeof ContentCalendarSchema>;

/**
 * Engine R2 contract — runs-index, bundle status, analytics summary.
 * See content-engine plan §3.1. Schema mismatches throw at load time.
 */

export const RunsIndexEntrySchema = z.object({
  bundle_id: z.string(),
  date: z.string(),
  pillar: z.string().optional(),
  stage: z.enum(["PRODUCED", "PUBLISHED", "MONITORED", "CLOSED", "FAILED"]).default("PRODUCED"),
  last_updated: z.string().optional(),
});
export type RunsIndexEntry = z.infer<typeof RunsIndexEntrySchema>;

export const RunsIndexSchema = z.object({
  runs: z.array(RunsIndexEntrySchema),
});
export type RunsIndex = z.infer<typeof RunsIndexSchema>;

const PlatformStatusSchema = z.object({
  state: z.enum(["pending", "scheduled", "posted", "failed", "skipped"]),
  late_post_id: z.string().nullable(),
  scheduled_for: z.string().nullable(),
  error: z.string().nullable(),
});

export const BundleStatusSchema = z.object({
  schema_version: z.literal(1),
  bundle_id: z.string(),
  stage: z.enum(["PRODUCED", "PUBLISHED", "MONITORED", "CLOSED", "FAILED"]),
  needs_reel: z.boolean(),
  reel_source: z.enum(["filmed", "vo"]).nullable(),
  footage_available: z.boolean(),
  transcript_available: z.boolean(),
  platforms: z.object({
    instagram_carousel: PlatformStatusSchema,
    tiktok_carousel: PlatformStatusSchema,
    instagram_reel: PlatformStatusSchema,
    tiktok_video: PlatformStatusSchema,
    linkedin: PlatformStatusSchema,
    twitter: PlatformStatusSchema,
  }),
  quality_gates: z.object({
    reel_video: z.enum(["pass", "fail", "na"]),
    reel_caption: z.enum(["pass", "fail", "na"]),
    carousel_html: z.enum(["pass", "fail", "na"]),
    carousel_copy: z.enum(["pass", "fail", "na"]),
    linkedin: z.enum(["pass", "fail", "na"]),
    twitter: z.enum(["pass", "fail", "na"]),
  }),
  warnings: z.array(z.string()).default([]),
  last_updated: z.string(),
});
export type BundleStatus = z.infer<typeof BundleStatusSchema>;

export const AnalyticsTopPostSchema = z.object({
  bundle_id: z.string(),
  platform: z.string(),
  pillar: z.string().optional(),
  engagement_score: z.number(),
  late_post_url: z.string().optional(),
});
export type AnalyticsTopPost = z.infer<typeof AnalyticsTopPostSchema>;

export const AnalyticsSummarySchema = z.object({
  last_analytics_run: z.string().nullable(),
  top_posts_14d: z.array(AnalyticsTopPostSchema).default([]),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;

/** Helper — checks the post-Phase-1 reel invariants the hub depends on. */
export function reelInvariantErrors(calendar: ContentCalendar): string[] {
  const errors: string[] = [];
  const reelCount = calendar.bundles.filter((b) => b.needs_reel === true).length;
  if (reelCount > 2) {
    errors.push(`reel hard cap violated: ${reelCount} bundles need_reel=true (max 2)`);
  }
  for (const b of calendar.bundles) {
    if (b.needs_reel === false) {
      if (b.filming_script !== null) errors.push(`${b.id}: filming_script must be null when needs_reel=false`);
      if (b.active_mediums.includes("reel")) errors.push(`${b.id}: reel must not be in active_mediums when needs_reel=false`);
    } else {
      if (!b.filming_script || !b.filming_script.trim()) {
        errors.push(`${b.id}: filming_script required when needs_reel=true`);
      } else {
        const words = b.filming_script.split(/\s+/).filter(Boolean).length;
        if (words < 90 || words > 150) errors.push(`${b.id}: filming_script is ${words} words (must be 90-150)`);
      }
      if (!b.active_mediums.includes("reel")) errors.push(`${b.id}: reel must be in active_mediums when needs_reel=true`);
    }
    if (b.hero_medium === "reel" && b.needs_reel !== true) {
      errors.push(`${b.id}: hero_medium=reel requires needs_reel=true`);
    }
  }
  return errors;
}
