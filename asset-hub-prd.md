# PHNTM Asset Hub — PRD

**Status:** Draft, ready to execute
**Owner:** Franco Bonifaz
**Last updated:** 2026-04-30
**Repo (to be created):** `phntm-asset-hub`
**Stack:** Next.js 14 (App Router), Cloudflare R2 (storage), MongoDB Atlas (metadata, optional), Railway (deploy)

---

## 0. How to use this document

Hand this entire file to a fresh Claude Code instance with the message:

> "Read `asset-hub-prd.md` end-to-end. Execute Phase 1 first, get me a working uploader and public URLs. Then check in before starting Phase 2. The content engine repo is at `~/Desktop/content-engine` — read its `CLAUDE.md` to understand the integration contract."

The PRD is self-contained. It does not require prior session context.

---

## 1. Why this exists

The Autonomous Content Engine (`~/Desktop/content-engine`) generates social media bundles. Two of its workers — piapi.ai (Seedance video) and getLate.dev (post scheduler) — require **publicly-resolvable URLs** for media inputs (character refs, voiceover audio, finished videos, carousel slides).

Today these URLs come from a public GitHub repo (`froncb/content-engine-assets`) used as a free CDN. That worked until 2026-04-30, when a missed `git push` caused piapi to 404 on a live test, blocking Phase 8.3.8f of the koda-seedance integration.

GitHub-as-CDN is the wrong primitive:
- Single point of failure on `git push` discipline
- No API for programmatic uploads (requires git operations from the engine)
- No auth — anyone can read every asset
- No structured listing — engine can't introspect what's uploaded
- Not designed for video files (rate limits, CDN caching quirks)

This project replaces it with proper asset infrastructure **and** layers a control panel on top so Franco can browse all generated content (across companies, weeks, runs) from one place.

### Goals

1. **Unblock piapi** — every asset the content engine produces has a stable, public, fast URL within seconds of being generated
2. **Replace GitHub-as-CDN** — migrate the 4+ existing references in `cinematic.md` + `voiceover-index.json` to the new asset host
3. **Browse runs visually** — a web UI to see every bundle ever produced (across companies), preview videos/slides, see post copy, link out to Late posts and live IG/TikTok/LinkedIn/X URLs
4. **Multi-tenant from day one** — the engine already runs PromptPerfect; future companies (PHNTM AI itself, clients) drop in without rework

### Non-goals

- Replacing `state.json` or `runs/index.json` — those stay on the local filesystem
- Replacing the agent architecture or `runs/` folder structure
- Building a content editor — the engine writes, the hub reads
- Auth beyond a single shared password — this is internal tooling, not a SaaS
- Real-time collaboration features

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Local Mac (content engine)                                 │
│  - launchd CRON                                             │
│  - runs/[ID]/* artifacts                                    │
│  - state.json, runs/index.json                              │
│  - imports upload-asset.js after each artifact written      │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS PUT (signed)
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare R2                                              │
│  Bucket: phntm-assets                                       │
│  Public domain: assets.phntm.ai (or *.r2.dev fallback)      │
│  Layout:                                                    │
│    {company}/runs/{run-id}/reel/reel.mp4                    │
│    {company}/runs/{run-id}/reel/clips/shot-01.mp4           │
│    {company}/runs/{run-id}/reel/voiceover-{block}.mp3       │
│    {company}/runs/{run-id}/carousel/slides/slide-01.jpg     │
│    {company}/runs/{run-id}/index.json   ← run metadata      │
│    {company}/character-refs/hero.jpg                        │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS GET (public)
               ▼
┌──────────────┴────────────────┐  ┌────────────────────────┐
│  piapi.ai (consumes URLs)     │  │  Asset Hub UI          │
│  - @image1: hero.jpg          │  │  (Next.js on Railway)  │
│  - @audio1: voiceover-X.mp3   │  │  - Browses R2 listing  │
└───────────────────────────────┘  │  - Renders run cards   │
                                   │  - Previews media      │
                                   │  - Reads index.json    │
                                   └────────────────────────┘
```

**Storage decision: R2, not MongoDB GridFS.**
R2 is purpose-built for blob storage with global CDN, free egress, public URLs out of the box, and an S3-compatible API. MongoDB GridFS chunks files across documents, requires an HTTP layer in front for public serving, and gets expensive at video sizes. Mongo could earn its place for *queryable run metadata* later (Phase 4+, post-cutover), but binary blobs always belong in object storage.

**Metadata decision: JSON-in-R2 for now, Mongo later if needed.**
After every run, the engine writes a single `index.json` to `{company}/runs/{run-id}/index.json` summarizing the bundle (concept, copy, post URLs, analytics). The UI reads these JSON files directly. No database needed for v1. If query patterns get complex (`db.runs.find({hook: 'data_drop', funnel: 'tofu'})`), bolt on Mongo Atlas in Phase 4 — the JSON files are the migration source of truth.

---

## 3. Phase 1 — R2 + uploader module (~1 hour, unblocks tonight)

### Acceptance criteria

- [ ] Cloudflare R2 bucket `phntm-assets` exists, public access via custom domain or `*.r2.dev`
- [ ] R2 API token created with read+write scoped to that bucket
- [ ] `~/Desktop/content-engine/.env` has `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=phntm-assets`, `R2_PUBLIC_BASE=https://assets.phntm.ai` (or r2.dev URL)
- [ ] `src/scripts/upload-asset.js` exposes both a CLI (`node upload-asset.js <local-path> <remote-key>`) and a programmatic export (`async function uploadAsset(localPath, remoteKey): Promise<string>`)
- [ ] `companies/promptperfect/company/assets/character-refs/hero.jpg` is uploaded to `promptperfect/character-refs/hero.jpg` and returns 200
- [ ] `companies/promptperfect/company/cinematic.md` line 47 updated to point at the R2 URL
- [ ] Test 8.3.8f operator script regenerated with R2 URLs and re-runnable

### Implementation steps

**Step 1.1 — Cloudflare R2 setup (manual, ~10 min)**

```
# In the Cloudflare dashboard:
# 1. R2 → Create bucket → name: phntm-assets, location: Auto
# 2. Bucket → Settings → Public Access → "Connect Domain" → assets.phntm.ai
#    (or skip and use the *.r2.dev URL Cloudflare provides)
# 3. R2 → Manage API Tokens → Create API Token
#    - Permissions: Object Read & Write
#    - Specify bucket: phntm-assets
#    - TTL: forever (rotate annually)
# 4. Save Account ID, Access Key ID, Secret Access Key
```

If using `assets.phntm.ai`: add a CNAME record in your DNS pointing to the R2 bucket per Cloudflare's instructions. Until DNS propagates, use the `pub-XXXXXX.r2.dev` URL.

**Step 1.2 — Add env vars (1 min)**

Append to `~/Desktop/content-engine/.env`:
```
R2_ACCOUNT_ID=<from cloudflare>
R2_ACCESS_KEY_ID=<from cloudflare>
R2_SECRET_ACCESS_KEY=<from cloudflare>
R2_BUCKET=phntm-assets
R2_PUBLIC_BASE=https://assets.phntm.ai
```

**Step 1.3 — Install AWS SDK v3 (R2 is S3-compatible) (1 min)**

```
cd ~/Desktop/content-engine
npm install @aws-sdk/client-s3
```

**Step 1.4 — Create the uploader (15 min)**

`src/scripts/upload-asset.js`:
- Loads R2 env vars via `dotenv`; aborts with clear error if any missing
- Uses `S3Client` with `endpoint: https://<account-id>.r2.cloudflarestorage.com`, region `auto`
- Exports `async function uploadAsset(localPath, remoteKey)` — reads file, infers `ContentType` from extension (.mp4, .mp3, .jpg, .png, .json, .md), uploads via `PutObjectCommand`, sets `CacheControl: public, max-age=31536000, immutable` for media; `no-cache` for `index.json`
- Returns `${R2_PUBLIC_BASE}/${remoteKey}` on success
- Throws on failure (the caller decides whether to swallow or propagate)
- CLI mode (when `require.main === module`): parses argv, calls `uploadAsset`, prints URL on success, prints `{ ok: false, error: { code, message } }` JSON to stderr and exits 1 on failure

This module is the **single integration point** for the engine. Other engine scripts (`generate-clips-piapi.js`, `generate-voiceover.js`, `render-reel-remotion.js`, `publisher`) `require` it directly — no shelling out to subprocess.

**Step 1.5 — Migrate hero.jpg (2 min)**

```
node src/scripts/upload-asset.js \
  companies/promptperfect/company/assets/character-refs/hero.jpg \
  promptperfect/character-refs/hero.jpg
# expect stdout: https://assets.phntm.ai/promptperfect/character-refs/hero.jpg
curl -sI https://assets.phntm.ai/promptperfect/character-refs/hero.jpg
# expect: 200 OK
```

**Step 1.6 — Update `cinematic.md` (1 min)**

In `companies/promptperfect/company/cinematic.md`, replace:
```
- **Character reference:** https://raw.githubusercontent.com/froncb/content-engine-assets/main/characters/promptperfect/hero.jpg
```
with:
```
- **Character reference:** https://assets.phntm.ai/promptperfect/character-refs/hero.jpg
```

Grep for any other `raw.githubusercontent.com/froncb` references and update them too. As of 2026-04-30 there are 4 known: `cinematic.md` (1) + `runs/test-8.3.8c-dry/reel/voiceover-index.json` (3).

**Step 1.7 — Regenerate `/tmp/run-8.3.8f.sh` (5 min)**

The original operator script for Task 8.3.8f hardcodes `raw.githubusercontent.com` URLs in:
- The `image_urls` array passed to piapi (uses hero.jpg)
- The `audio_urls` array passed to piapi (built from upload-audio-shadow output)

Regen so:
- `image_urls = ["https://assets.phntm.ai/promptperfect/character-refs/hero.jpg"]`
- The `upload-audio-shadow` step is replaced by an inline call to `node src/scripts/upload-asset.js runs/test-8.3.8f-lipsync/reel/voiceover-HOOK.mp3 promptperfect/runs/test-8.3.8f-lipsync/reel/voiceover-HOOK.mp3` capturing the printed URL into the next piapi request body

The rest of the script (dual-tier piapi calls, error handling, log to operator-log.txt) stays identical.

**Step 1.8 — Smoke test (5 min)**

```
# Test the uploader with a dummy file
echo "smoke" > /tmp/smoke.txt
node src/scripts/upload-asset.js /tmp/smoke.txt smoke-test/$(date +%s).txt
# Click the URL it prints. Should download "smoke".

# Verify hero.jpg
curl -sIo /dev/null -w "%{http_code}\n" https://assets.phntm.ai/promptperfect/character-refs/hero.jpg
# expect: 200
```

**Phase 1 done.** The content engine can now resume Phase 8.3.8f with R2-hosted assets. Spend the $1.71 with confidence.

---

## 4. Phase 2 — Auto-upload integration (~3 hours, ships next day)

### Acceptance criteria

- [ ] Every artifact the engine produces is auto-uploaded to R2 at the canonical key (no manual upload step)
- [ ] Each run produces a `runs/[ID]/index.json` that gets uploaded last, after all media
- [ ] `index.json` contains: company, run_id, date, pillar, funnel_stage, hook_type, concept summary, per-medium copy text, per-medium media URLs (R2), per-platform Late post IDs, per-platform live URLs (after publish), analytics snapshot (filled in later by analytics-agent)
- [ ] Existing engine commands (`/run-daily`, `/plan-week`, `/analyze`) work without modification — uploads are additive
- [ ] Upload failures NEVER block a run — they warn, log, and continue (engine retries on the next housekeeping pass)

### Integration points

Each of these existing engine scripts adds a few lines to `require` and call the uploader after producing its artifact:

| Script | Artifact | R2 key |
|---|---|---|
| `generate-clips-piapi.js` | `clips/shot-NN.mp4` | `{company}/runs/{id}/reel/clips/shot-NN.mp4` |
| `generate-voiceover.js` | `voiceover-{block}.mp3` | `{company}/runs/{id}/reel/voiceover-{block}.mp3` |
| `render-reel-remotion.js` | `reel.mp4`, `reel-thumbnail.png` | `{company}/runs/{id}/reel/reel.mp4` etc. |
| `render-carousel.js` | `slides/slide-NN.jpg` | `{company}/runs/{id}/carousel/slides/slide-NN.jpg` |
| `publisher` | `index.json` (final) | `{company}/runs/{id}/index.json` |

`upload-asset.js` from Phase 1 is unchanged — these scripts import it as a module:

```js
const { uploadAsset } = require('./upload-asset');

// after writing voiceover-HOOK.mp3 locally:
try {
  const url = await uploadAsset(
    localPath,
    `${company}/runs/${runId}/reel/voiceover-${block}.mp3`
  );
  voiceoverIndex[block].audio_public_url = url;
} catch (err) {
  console.warn(`[voiceover] R2 upload failed for ${block}: ${err.message}. Local-only.`);
}
```

This keeps the upload in-process — no shell, no subprocess, no command-injection surface. Errors propagate as native JS exceptions and the catch block decides degrade behavior.

### `index.json` schema

```json
{
  "schema_version": 1,
  "company": "promptperfect",
  "run_id": "2026-04-30-cursor-rules-extraction",
  "produced_at": "2026-04-30T13:00:00Z",
  "published_at": "2026-04-30T18:00:00Z",
  "pillar": "ai-engineering",
  "funnel_stage": "tofu",
  "hook_type": "data_drop",
  "concept": {
    "title": "Stop writing rules. Extract them from your repo.",
    "summary": "...",
    "selection_mode": "SINGLE"
  },
  "platforms": {
    "instagram_carousel": {
      "media_urls": ["https://assets.phntm.ai/.../slide-01.jpg", "..."],
      "caption": "...",
      "late_post_id": "...",
      "live_url": "https://www.instagram.com/p/...",
      "scheduled_for": "2026-04-30T18:00:00Z"
    },
    "tiktok_carousel": { },
    "instagram_reel": { },
    "tiktok_video": { },
    "linkedin": { },
    "twitter": { }
  },
  "analytics": {
    "pulled_at": null,
    "metrics": null
  }
}
```

The publisher writes this file at the end of `/run-daily`. Analytics-agent updates the `analytics` block 48h later when it pulls metrics.

### A note on idempotency

R2 PutObject is naturally idempotent (same key → overwrite). Re-running an upload during retries is safe. Use the run_id + canonical path as the key — never timestamp-suffix media files.

### Why not Mongo for `index.json`?

Because filesystem JSON + R2 mirror is two-write but readable by humans and trivially debuggable. If the UI needs to query across runs (`show me every TOFU bundle that used data_drop hook in March`), Mongo earns its keep — see Phase 4. Until then, the UI reads `index.json` files directly and filters in memory. Acceptable up to ~hundreds of runs per company.

---

## 5. Phase 3 — Asset Hub UI (~2 days, ships in week 1)

### Acceptance criteria

- [ ] Next.js 14 app deployed on Railway at `hub.phntm.ai` (or Railway's default URL)
- [ ] Single password gate (env var `HUB_PASSWORD`) — no user accounts
- [ ] Companies dropdown at top — switches root context
- [ ] Calendar/week view of bundles for the selected company
- [ ] Per-bundle detail view: 6 platform cards with copy + media preview + live URL + analytics
- [ ] Raw R2 file browser tab — useful for debugging, lists all keys under a prefix
- [ ] All reads come from R2 (list objects + fetch index.json) — no DB

### Tech stack (specific)

- **Next.js 14** App Router (server components for R2 reads, client for media players)
- **Tailwind CSS** for styling — match PHNTM Core's design system if it exists, otherwise use the dark editorial look from `companies/promptperfect/company/visual-system.md`
- **shadcn/ui** for components (Card, Tabs, Dialog, Select)
- **`@aws-sdk/client-s3`** for R2 reads (server-side only — never expose creds to browser)
- **`react-player`** or native `<video>` for reel previews
- **`react-markdown`** for rendering copy.md content inline
- **Zod** for parsing `index.json` (schema-validate every read)

### Page structure

```
/                         → password gate (single input, sets cookie)
/companies                → grid of company cards (PromptPerfect, future)
/c/[company]              → company home: this week's bundles + stats
/c/[company]/calendar     → weekly grid (Mon-Sun, bundles per day)
/c/[company]/runs         → list of all runs, filterable
/c/[company]/runs/[id]    → bundle detail (6 platform cards)
/c/[company]/assets       → raw R2 file browser by prefix
/health                   → JSON: bucket reachable, last upload, etc.
```

### Bundle detail layout

```
┌─ Header ────────────────────────────────────────────────┐
│  PromptPerfect / 2026-04-30-cursor-rules-extraction     │
│  Pillar: ai-engineering · Funnel: TOFU · Hook: data_drop│
│  Status: PUBLISHED · 6/6 platforms scheduled            │
└─────────────────────────────────────────────────────────┘
┌─ Concept ───────────────────────────────────────────────┐
│  "Stop writing rules. Extract them from your repo."     │
│  [renders concept.md from R2]                           │
└─────────────────────────────────────────────────────────┘
┌─ Platform grid (6 cards in 3x2) ───────────────────────┐
│  ┌─ IG Carousel ────┐  ┌─ TikTok Carousel ────────┐    │
│  │ [slides preview]  │  │ [same slides preview]    │   │
│  │ Caption excerpt   │  │ Caption excerpt          │   │
│  │ → live IG link    │  │ → live TikTok link       │   │
│  └──────────────────┘  └──────────────────────────┘    │
│  ┌─ IG Reel ────────┐  ┌─ TikTok Video ───────────┐    │
│  │ [video player]   │  │ [same video player]      │    │
│  │ Caption          │  │ Caption                  │    │
│  └──────────────────┘  └──────────────────────────┘    │
│  ┌─ LinkedIn ───────┐  ┌─ Twitter/X ──────────────┐    │
│  │ Full text post   │  │ Single tweet             │    │
│  │ → live LI link   │  │ → live X link            │    │
│  └──────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
┌─ Analytics (if pulled) ────────────────────────────────┐
│  IG: 2.1k impr · 142 likes · 8 saves · 3 comments      │
│  TikTok: 11.3k views · 401 likes · ...                 │
└─────────────────────────────────────────────────────────┘
```

### Calendar view

A standard week grid (Mon at top-left through Sun bottom-right). Each day cell shows the bundles produced that day as small chips. Click chip → bundle detail. Top of the page: company selector + week navigator (`< prev | week of 2026-04-27 | next >`).

### Raw assets browser

A tree view of R2 keys under the selected company prefix. For each file:
- Filename + size + last-modified
- "Copy public URL" button
- For images: thumbnail
- For videos: click to expand inline player
- For .md / .json: click to view rendered

This is the "I just need to grab a URL or check what got uploaded" tool.

### Auth

Single password from `HUB_PASSWORD` env var. On `/`, render a single input. POST to `/api/auth` which compares to env var, sets `hub-auth=1` httpOnly cookie on match. Middleware on every other route checks cookie. That's it. No accounts, no rotation logic, no recovery flow. Internal tool.

### Deployment

Railway service with:
- Build command: `npm run build`
- Start command: `npm run start`
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`, `HUB_PASSWORD`
- Custom domain: `hub.phntm.ai` (CNAME to Railway's host)

---

## 6. Phase 4 — Mongo metadata layer (later, ~1 day, only if needed)

**Trigger:** when the UI starts feeling slow because it's reading hundreds of `index.json` files per page-load, OR when you want cross-run queries the JSON-scan approach can't handle.

### What this phase does

- Adds MongoDB Atlas (free tier: 512MB) — connection string in env
- After every successful publish, engine writes `index.json` to BOTH R2 and Mongo (`runs` collection)
- UI switches its list/calendar reads from "list R2 + parse JSON" to "Mongo find with index"
- Bundle detail still reads R2 directly (the JSON in Mongo is a denormalized copy for fast queries; R2 is source of truth)

### Why this phase is gated

If the UI feels fast at the run-counts you actually have, you don't need Mongo. Reading 50 JSON files in parallel from R2 with a 50ms p99 is ~150ms total — fine. Mongo is for when you've got thousands of runs.

### Schema (when you build it)

`runs` collection, one document per bundle, mirrors `index.json` 1:1. Indexes on `{company, produced_at}` (default sort) and `{company, pillar}`, `{company, funnel_stage}`, `{company, hook_type}` for filters.

---

## 7. Repo structure (`phntm-asset-hub`)

```
phntm-asset-hub/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── README.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # password gate
│   ├── companies/page.tsx
│   ├── c/[company]/
│   │   ├── page.tsx              # company home
│   │   ├── calendar/page.tsx
│   │   ├── runs/page.tsx
│   │   ├── runs/[id]/page.tsx    # bundle detail
│   │   └── assets/page.tsx
│   ├── api/
│   │   ├── auth/route.ts
│   │   └── r2/list/route.ts      # server-only R2 list helper
│   └── health/route.ts
├── lib/
│   ├── r2.ts                     # S3Client factory + helpers
│   ├── runs.ts                   # parse + cache index.json
│   ├── auth.ts                   # cookie check middleware helper
│   └── schema.ts                 # zod schemas for index.json
├── components/
│   ├── BundleCard.tsx
│   ├── PlatformCard.tsx
│   ├── MediaPreview.tsx
│   ├── CalendarGrid.tsx
│   └── ui/                        # shadcn primitives
└── middleware.ts                  # auth gate
```

---

## 8. Integration contract with the content engine

The engine (`~/Desktop/content-engine`) must be updated to import and call `uploadAsset` after producing each artifact. This is additive — failing uploads must not block the run (graceful degrade: warn, continue, retry next phase).

**Engine-side env propagation:**

R2 env vars in `~/Desktop/content-engine/.env` are loaded by `dotenv` at the top of `upload-asset.js`. No global config changes needed.

**Engine-side documentation:**

Add a section to `~/Desktop/content-engine/CLAUDE.md` after "Tech Stack" describing the asset hub as the canonical asset host, with a one-line link to this PRD.

---

## 9. Cost projection

| Item | Monthly | Notes |
|---|---|---|
| Cloudflare R2 storage | $0.015/GB | ~10 GB after 6mo of daily runs = $0.15/mo |
| Cloudflare R2 egress | $0 | Free egress is the killer feature |
| Cloudflare R2 Class A ops (writes) | $4.50/M | ~3k writes/mo = $0.01/mo |
| Cloudflare R2 Class B ops (reads) | $0.36/M | ~30k reads/mo = $0.01/mo |
| Railway Asset Hub service | $5/mo | Hobby tier, possibly $0 if usage stays low |
| Custom domain (assets.phntm.ai) | $0 | Use existing phntm.ai if you have it; else ~$10/yr |
| MongoDB Atlas (Phase 4 only) | $0 | Free tier 512MB |
| **Total month 1** | **~$5/mo** | |
| **Total at Phase 4** | **~$5/mo** | Mongo free tier covers it |

---

## 10. Open decisions (call out before building)

1. **Domain:** `assets.phntm.ai` for the bucket and `hub.phntm.ai` for the UI? Or just `*.r2.dev` + Railway's default URL? Default-URL is faster to ship; custom domain is cleaner long-term. **Recommendation: ship with default URLs in Phase 1, swap to custom domains during Phase 3.**

2. **Per-company sub-buckets vs. shared bucket:** the PRD assumes one bucket with `{company}/` prefixes. Alternative: one bucket per company. Shared is simpler, prefix-based access control still works. **Stay with shared.**

3. **Should the UI show legacy pre-Phase-8 runs?** Pre-Phase-8 runs use flat layouts (`carousel-copy.md` at root). Engine's `index.json` writer should handle both. **Yes — write `schema_version: 1` and translate flat → nested at write time.**

4. **Auth beyond password?** Future: Cloudflare Access (zero-trust SSO) wraps the Railway URL. Not in scope for v1.

---

## 11. Security checklist

- [ ] R2 API token is **bucket-scoped**, not account-wide
- [ ] R2 secret never appears in client-side code (UI is SSR for R2 reads)
- [ ] `.env` is gitignored (verify before first commit)
- [ ] `HUB_PASSWORD` is at least 24 chars random
- [ ] Hub auth cookie is `httpOnly`, `secure`, `sameSite=strict`
- [ ] Public URLs are read-only — no PUT or DELETE possible without API token
- [ ] If later adding character refs that include real human likeness: review whether public URLs are appropriate or if signed URLs are needed
- [ ] Engine integration uses `require('./upload-asset')` directly (in-process JS module) — never shell out to `exec(...)` with interpolated paths

---

## 12. Migration plan (post-Phase-1)

Once Phase 1 ships and the engine writes new assets to R2:

1. Run a one-time backfill script that walks `runs/` and re-uploads existing artifacts to their canonical R2 keys
2. For each run with platforms already published, write `index.json` from existing files (build a `backfill-index.js` script)
3. Verify UI shows historical runs correctly
4. **Do not** delete the GitHub `froncb/content-engine-assets` repo until 30 days have passed without any 404 reports — keep it as a fallback during cutover

---

## 13. Rollout sequence

| Day | Phase | Outcome |
|---|---|---|
| Day 0 (today) | Phase 1 | piapi unblocked, hero.jpg on R2, 8.3.8f resumes |
| Day 1 | Phase 2 | Engine auto-uploads to R2, `index.json` written per run |
| Day 2-3 | Phase 3 | UI deployed to Railway, can browse runs visually |
| Week 2 | Backfill | Historical runs migrated, UI shows full history |
| Month 2+ | Phase 4 | Add Mongo if/when query patterns demand it |

---

## 14. Definition of done (whole project)

- [ ] Zero `raw.githubusercontent.com/froncb` references remain in `~/Desktop/content-engine`
- [ ] Every new run produced by `/run-daily` lands in R2 within 60s of artifact creation
- [ ] Asset Hub UI loads in <2s for any company home page
- [ ] Bundle detail page loads in <3s including video preview
- [ ] Operator can click any run from any company and see all 6 platform posts with live URLs
- [ ] Phase 8.3.8f operator script completes successfully with R2-hosted assets
- [ ] Content engine `CLAUDE.md` updated to document the new asset flow
- [ ] PRD section 12 backfill script run and verified

---

## 15. Decision log (alternatives rejected)

| Alternative | Why rejected |
|---|---|
| MongoDB GridFS for blobs | Wrong tool for video — slow, expensive, requires HTTP layer for public URLs |
| AWS S3 | Egress fees ($0.09/GB) become real at video scale; R2 is free egress |
| Backblaze B2 | Cheaper at rest but slower CDN coverage than Cloudflare; not worth the swap |
| Vercel Blob | Tied to Vercel deployment, more expensive per GB, less control |
| Just fix the GitHub push | Solves today but doesn't replace the broken pattern; same bug class will recur |
| Build everything (Phases 1-3) before the live test | Blocks Franco for 2 days on a $1.71 test that gates 3 weeks of work |
| Use one Mongo doc per asset (no R2) | Conflates blob storage with metadata, makes UI 5x more complex, makes piapi URLs slower |
| Engine shells out to `node upload-asset.js` via child_process.exec | Command-injection surface; in-process `require('./upload-asset')` is safer and faster |

---

**End of PRD.** Ready to hand off.
