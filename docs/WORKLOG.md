# Work Log

## YYYY-MM-DD
- What I worked on:
- Current status:
- Next step:
- Notes/decisions:

## 2025-12-23
- What I worked on:
  - Stabilized staging deployment: Render start script runs Alembic migrations and uses psycopg URL scheme.
  - Documented dev/staging wiring with diagrams, env vars, and migration/seed workflows.
  - Added staging seed scripts and Makefile target for uploading local originals to staging.
  - Added OpenAI usage tracking, balance UI link, and auto-tagging job status/polling (earlier in session).
  - Resolved staging DB wiring issues and documented Render Postgres warning/metadata.
- Current status:
  - Staging API boots cleanly with Alembic migrations and health check returns OK.
  - Dev and staging environment workflow is documented in README and architecture doc.
  - Optional seed tooling is available via `make seed-staging`.
- Next step:
  - Set `BHP_OPENAI_API_KEY` in Render and validate auto-tagging on staging.
  - Seed staging with a small image set and verify review workflow.
- Notes/decisions:
  - Render requires `postgresql+psycopg://` URLs to avoid psycopg2 import errors.
  - Render free tier DB expires Jan 23, 2026; plan upgrade before then.

## 2025-12-22
- What I worked on:
  - Implemented asset storage + API endpoints for uploads, tagging, roles, ratings, focal points, thumbnails, previews, and deletes.
  - Added derivative generation and batch CLI, plus storage config and migrations.
  - Built a scalable admin photo library UI with workflow lanes, filters, bulk actions, previews, and multi-file upload.
  - Enforced hero main uniqueness, published role rules, and UI role toggles with publish state.
- Current status:
  - Admin photo library supports uploads, tagging, role management, previews, and publish/delete constraints.
  - Migrations include published role flag and asset tables.
- Next step:
  - Add AI auto-tagging pipeline and placement logic for hero/gallery/showcase selection.
- Notes/decisions:
  - Hero main is required and unique; published logo/showcase assets cannot be deleted.

## 2025-12-21
- What I worked on:
  - Scaffolded public site routes and admin console routes in Next.js.
  - Added basic auth middleware for `/admin` and documented env vars.
  - Updated docs with hosted wiring and troubleshooting notes.
  - Pushed changes to GitHub and verified staging `/admin` auth.
- Current status:
  - Staging site updated; `/admin` is protected by basic auth.
  - API health checks working from the admin dashboard.
- Next step:
  - Confirm site design direction and image storage path; start OpenAI tagging pipeline (API + DB).
- Notes/decisions:
  - Middleware must live at `apps/ui/src/middleware.ts` for Next.js.

## 2025-12-18
- What I worked on:
  - Added env configuration for UI/API and wired UI to use `NEXT_PUBLIC_API_BASE_URL`.
  - Refactored API to versioned routing with settings and CORS config.
  - Added Alembic migration scaffold and SQLAlchemy base.
  - Added API health test, CI workflow, and updated README/Makefile/session scripts.
- Current status:
  - UI and API run in separate terminals and health check works via `/api/v1/health`.
  - Docker services are running and can be started/stopped via `make start/stop`.
- Next step:
  - Install updated API dependencies, create env files, and restart servers.
- Notes/decisions:
  - No product/requirements changes; only baseline infra/config/test scaffolding.

## 2025-12-20
- What I worked on:
  - Pushed repo to GitHub and set the default branch to `main`.
  - Deployed UI to Vercel with root directory `apps/ui` and Next.js preset.
  - Added `staging.brianhopkinsphoto.com` and configured GoDaddy CNAME to Vercel.
  - Deployed API to Render with root directory `apps/api`.
  - Set `BHP_CORS_ORIGINS` on Render and `NEXT_PUBLIC_API_BASE_URL` on Vercel.
  - Verified API health and staging UI wiring.
- Current status:
  - Staging UI is live at `https://staging.brianhopkinsphoto.com`.
  - API is live at `https://bhp-console.onrender.com` and responds on `/api/v1/health`.
- Next step:
  - Start website design and the photo ingest/tagging pipeline.
- Notes/decisions:
  - Hosting: Vercel for UI, Render for API; keep production domain on GoDaddy for now.
  - Struggles: branch mismatch (`master` vs `main`), Vercel root directory/framework preset, Render root directory, CORS env parsing, intermittent Render logs.

## 2025-12-20
- What I worked on:
  - Fixed Alembic pin and CORS env format
  - Set up direnv and pip CA config
  - Added API package markers + pytest config
  - Fixed UI lint dependency and ran tests
- Current status:
  - [update status]
- Next step:
  - [add next step]
- Notes/decisions:
  - [add notes]
