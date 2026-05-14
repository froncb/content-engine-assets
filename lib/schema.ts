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
