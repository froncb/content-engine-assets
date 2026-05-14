# PHNTM Asset Hub

Bundle-detail dashboard for the [content-engine](../content-engine). Surfaces the planner's weekly filming scripts and accepts video uploads against specific bundles.

Active spec: [`asset-hub-prd.md`](./asset-hub-prd.md) — superseded in part by [`filmed-footage-workflow-prd.md`](../../content-engine/docs/filmed-footage-workflow-prd.md) §4 (this hub IS that PRD's Phase 2).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind
- Cloudflare R2 (S3-compatible) for asset storage
- Single-password gate (`HUB_PASSWORD`)
- Deployed to Railway (planned)

## Dev

```bash
cp .env.example .env.local       # fill in HUB_PASSWORD + R2 creds
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with `HUB_PASSWORD`.

## Layout

```
app/
  api/auth/route.ts          # POST sets cookie, DELETE clears
  api/health/route.ts        # JSON liveness
  companies/page.tsx         # company picker
  _components/               # client components
  page.tsx                   # password gate
lib/
  auth.ts                    # password verify + cookie helper (node runtime)
  r2.ts                      # S3 client + presign + canonical key helpers
  schema.ts                  # Zod schema mirroring planner.md output contract
  cn.ts                      # className merge helper
middleware.ts                # edge-runtime auth gate
```

## R2 key conventions

| What | Key |
|---|---|
| Weekly calendar | `{company}/weeks/{YYYY-MM-DD}/content-calendar.json` |
| Filmed footage | `{company}/runs/{bundle-id}/footage/source.{mp4,mov}` |
| Whisper transcript | `{company}/runs/{bundle-id}/footage/transcript.json` |

The engine writes calendars to R2 in `/plan-week` Phase 4; the hub reads them.
