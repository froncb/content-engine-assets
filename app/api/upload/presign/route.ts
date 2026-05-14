import { NextResponse } from "next/server";
import { footageKey, presignPut, r2PublicUrl } from "@/lib/r2";

export const runtime = "nodejs";

const ALLOWED_COMPANIES = (process.env.COMPANIES || "promptperfect")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

export async function POST(req: Request) {
  let body: { company?: string; bundleId?: string; ext?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { company, bundleId, ext, contentType } = body;

  if (!company || !ALLOWED_COMPANIES.includes(company)) {
    return NextResponse.json({ error: "unknown_company" }, { status: 400 });
  }
  if (!bundleId || !/^[a-z0-9][a-z0-9\-]{2,80}$/.test(bundleId)) {
    return NextResponse.json({ error: "invalid_bundle_id" }, { status: 400 });
  }
  if (ext !== "mp4" && ext !== "mov") {
    return NextResponse.json({ error: "unsupported_extension" }, { status: 400 });
  }
  const ct =
    contentType && /^(video\/(mp4|quicktime))$/i.test(contentType)
      ? contentType
      : ext === "mov"
      ? "video/quicktime"
      : "video/mp4";

  const key = footageKey(company, bundleId, ext);
  try {
    const uploadUrl = await presignPut({ key, contentType: ct, expiresIn: 600 });
    return NextResponse.json({
      uploadUrl,
      publicUrl: r2PublicUrl(key),
      expiresIn: 600,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "presign_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
