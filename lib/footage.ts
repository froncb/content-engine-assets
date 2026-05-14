import "server-only";
import { footageKey, objectExists, r2PublicUrl } from "@/lib/r2";

export type FootageStatus = {
  uploaded: boolean;
  ext: "mp4" | "mov" | null;
  publicUrl: string | null;
};

/**
 * Checks both .mp4 and .mov keys (Franco uploads either). Returns the first
 * one that exists with its public URL.
 */
export async function getFootageStatus(
  company: string,
  bundleId: string
): Promise<FootageStatus> {
  for (const ext of ["mp4", "mov"] as const) {
    const key = footageKey(company, bundleId, ext);
    if (await objectExists(key)) {
      return { uploaded: true, ext, publicUrl: r2PublicUrl(key) };
    }
  }
  return { uploaded: false, ext: null, publicUrl: null };
}
