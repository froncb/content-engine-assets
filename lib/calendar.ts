import "server-only";
import { calendarKey, getJson } from "@/lib/r2";
import { ContentCalendarSchema, type ContentCalendar, type Bundle } from "@/lib/schema";

/**
 * Resolves the Monday of the ISO week containing `dateISO`.
 * Sunday rolls back to the previous Monday (ISO weeks start Monday).
 */
export function isoMonday(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function todayInPT(): string {
  // Stable date string in America/Los_Angeles regardless of server TZ.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // en-CA → YYYY-MM-DD
}

export async function loadCalendar(
  company: string,
  weekStart: string
): Promise<ContentCalendar | null> {
  const raw = await getJson(calendarKey(company, weekStart));
  if (!raw) return null;
  const parsed = ContentCalendarSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Calendar schema mismatch for ${company}/${weekStart}: ` +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
  }
  return parsed.data;
}

export async function loadCurrentWeekCalendar(
  company: string
): Promise<{ weekStart: string; calendar: ContentCalendar | null }> {
  const weekStart = isoMonday(todayInPT());
  const calendar = await loadCalendar(company, weekStart);
  return { weekStart, calendar };
}

export function findBundle(
  calendar: ContentCalendar,
  bundleId: string
): Bundle | null {
  return calendar.bundles.find((b) => b.id === bundleId) ?? null;
}

export function bundlesByDate(calendar: ContentCalendar): Map<string, Bundle[]> {
  const map = new Map<string, Bundle[]>();
  for (const b of calendar.bundles) {
    const list = map.get(b.date) ?? [];
    list.push(b);
    map.set(b.date, list);
  }
  // Sort each day's bundles by target_time string ascending.
  for (const list of map.values()) {
    list.sort((a, b) => a.target_time.localeCompare(b.target_time));
  }
  return map;
}

export const DAY_NAMES: Record<string, string> = {
  "0": "Sunday",
  "1": "Monday",
  "2": "Tuesday",
  "3": "Wednesday",
  "4": "Thursday",
  "5": "Friday",
  "6": "Saturday",
};

export function dayName(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  return DAY_NAMES[d.getUTCDay().toString()] ?? "—";
}
