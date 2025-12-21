# Work Log

## YYYY-MM-DD
- What I worked on:
- Current status:
- Next step:
- Notes/decisions:

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
