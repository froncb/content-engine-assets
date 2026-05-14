# PHNTM Asset Hub

Bundle-detail dashboard for the [content-engine](../content-engine). Surfaces the planner's weekly filming scripts and accepts video uploads against specific bundles.

Active spec: [`asset-hub-prd.md`](./asset-hub-prd.md) — superseded in part by [`filmed-footage-workflow-prd.md`](../../content-engine/docs/filmed-footage-workflow-prd.md) §4 (this hub IS that PRD's Phase 2).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind (custom ink/accent palette, dark)
- Cloudflare R2 (S3-compatible, browser→R2 direct uploads via presigned PUT)
- Single-password gate (`HUB_PASSWORD`, httpOnly cookie)
- Deployed to Railway

## Dev

```bash
cp .env.example .env.local       # fill in HUB_PASSWORD + R2 creds
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with `HUB_PASSWORD`.

### Seeding R2 for local dev

Until `/plan-week` runs in prod, R2 is empty. Use the sample calendar fixture and the engine's uploader to seed a week:

```bash
# from ~/Desktop/content-engine
node src/scripts/upload-asset.js \
  "../ACTIVE PROJECTS/content-machine-asset-hub/fixtures/sample-calendar.json" \
  promptperfect/weeks/2026-05-18/content-calendar.json
```

The hub uses the active PT date to derive `isoMonday()`. Reset your Mac time or edit `lib/calendar.ts:todayInPT` for a quick override during dev.

### R2 CORS (required for browser uploads)

Browser → R2 PUT requires CORS on the bucket. Add this in the Cloudflare R2 dashboard → bucket settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://hub.phntm.ai"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://hub.phntm.ai` with your actual Railway URL during deploy.

## Layout

```
app/
  api/auth/route.ts            # POST sets cookie, DELETE clears
  api/health/route.ts          # JSON liveness
  api/upload/presign/route.ts  # signs R2 PUT URL for footage upload
  companies/page.tsx           # company picker
  c/[company]/page.tsx         # weekly bundle list
  c/[company]/bundle/[id]/page.tsx  # detail + filming_script + upload zone
  _components/                 # client components
  page.tsx                     # password gate
components/
  header.tsx                   # sticky breadcrumb
  bundle-list.tsx              # weekly list with needs_reel chips
  filming-script-viewer.tsx    # suggested-script viewer + copy button
  upload-zone.tsx              # drag-drop + presigned PUT progress
lib/
  auth.ts                      # password verify + cookie helper (node runtime)
  r2.ts                        # S3 client + presign + canonical key helpers
  schema.ts                    # Zod schema mirroring planner.md 15-field contract
  calendar.ts                  # load + parse + isoMonday helpers
  footage.ts                   # HEAD R2 for existing source.mp4|mov
  cn.ts                        # className merge helper
middleware.ts                  # edge-runtime auth gate
fixtures/
  sample-calendar.json         # 6-bundle PromptPerfect example for seeding
```

## R2 key conventions

| What | Key |
|---|---|
| Weekly calendar | `{company}/weeks/{YYYY-MM-DD}/content-calendar.json` |
| Filmed footage | `{company}/runs/{bundle-id}/footage/source.{mp4,mov}` |
| Whisper transcript | `{company}/runs/{bundle-id}/footage/transcript.json` |

The engine writes calendars to R2 in `/plan-week` Phase 4; the hub reads them. Filming scripts are **suggestions** Franco may read, paraphrase, or improvise from — the reel adapts to whatever he actually films, but the carousel, LinkedIn post, and tweet stay on the predetermined topic (see `filmed-footage-workflow-prd.md` §1.5).
