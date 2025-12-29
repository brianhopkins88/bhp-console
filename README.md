# BHP Management Console

Local-first web app to automate website, marketing, CRM, and finances for Brian Hopkins Photography.

## Structure
- apps/ui: Next.js frontend
- apps/api: FastAPI backend
- packages/*: shared modules (agents, tools, connectors, policy)
- infra: docker compose + local services
- storage: local photo library + derived assets
- docs/WORKLOG.md: Epic 0 module inventory + architecture overview (keep updated)

## Local workflow
Start everything:
- `make start`
- `make session-start`

Stop everything:
- `make stop`
- `make session-stop`

Environment setup:
- `cp apps/ui/.env.example apps/ui/.env.local`
- `cp apps/api/.env.example .env`

Dev servers (run in separate terminals):
- `make api`
- `make ui`
Local UI API base:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001` in `apps/ui/.env.local`

Session scripts:
- `make session-start` prints quick context, runs `make infra-up`, and reminds you to run `make api` and `make ui`.
- `make session-stop` appends to `docs/WORKLOG.md` and runs `make infra-down`.
- `make start/stop` only handle infra; use session scripts if you want the worklog prompts.

Session notes:
- update `docs/WORKLOG.md` at the end of each session
- update the Epic 0 module inventory section in `docs/WORKLOG.md` when code modules change

## Hosted staging (current)
- UI: Vercel (root: `apps/ui`, framework: Next.js)
- API: Render (root: `apps/api`)
- DNS: GoDaddy CNAME for `staging.brianhopkinsphoto.com` -> Vercel
Warning:
- Render Postgres free tier expires on January 23, 2026 and will be deleted unless upgraded to a paid instance.
Remember:
- Redeploy Vercel/Render after changing environment variables.
- Render free tier can cold start; first request may be slow.
- Vercel/Render stay up without any local session scripts.
- Render start command: `./scripts/render_start.sh` (runs Alembic migrations before boot).
- Optional staging seed: `python apps/api/scripts/seed_staging_uploads.py --api-base-url https://bhp-console.onrender.com --dir /path/to/images`
- Optional staging seed (Makefile): `BHP_SEED_UPLOAD_DIR=/path/to/images make seed-staging`
Staging specifics:
- API uses Render Postgres. Set `BHP_DATABASE_URL` and `DATABASE_URL` in Render.
- DB URL must use `postgresql+psycopg://` (Render's default `postgresql://` triggers psycopg2 import errors).
- Set `BHP_OPENAI_API_KEY` in Render (secret env var).
- Storage in staging is the service filesystem; attach a disk or use object storage for durability.

Dev-only auto-seed on git push (optional):
- Install the hook: `cp scripts/hooks/post-push .git/hooks/post-push && chmod +x .git/hooks/post-push`
- Set env vars:
  - `BHP_SEED_UPLOAD_DIR=/path/to/images`
  - `BHP_SEED_API_BASE_URL=https://bhp-console.onrender.com` (optional)
  - `BHP_SEED_TAGS="family,portrait"` (optional)
  - `BHP_SEED_LIMIT=20` (optional)
  - `BHP_SEED_NO_DERIVATIVES=1` (optional)
  - `BHP_SEED_ON_PUSH=0` to disable when you want to be careful.

Sync workflow (dev -> staging):
- Push to GitHub -> Vercel/Render deploy from `main`.
- Render start script runs Alembic migrations on every deploy.
- Use `make seed-staging` to copy local originals into staging.
- Seed adds data; to fully overwrite staging, wipe the staging DB/storage first.

## Public site pages (planned)
- Home (`/`)
- Services (`/services`)
- Portfolio (`/portfolio`)
- About (`/about`)
- Blog (`/blog`)
- Contact (`/contact`)

## Admin console (v1)
- `/admin` dashboard
- Photo library upload + tagging
- Gallery assignments (service + homepage)
- Draft review (copy suggestions)

Admin auth:
- Basic auth is enforced for `/admin`.
- Set `ADMIN_BASIC_AUTH_USER` and `ADMIN_BASIC_AUTH_PASS` in Vercel and local `.env.local`.

Environment variables:
- Vercel: `NEXT_PUBLIC_API_BASE_URL=https://bhp-console.onrender.com`
- Render: `BHP_CORS_ORIGINS=["https://staging.brianhopkinsphoto.com"]`
- Render DB: set `BHP_DATABASE_URL` or `DATABASE_URL` (the start script maps it).
Seed script TLS:
- If your local TLS chain requires a custom CA, set `BHP_CA_BUNDLE` (or `SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE`) before running `make seed-staging`.

## Tests
- API: `cd apps/api && pytest`
- UI: `cd apps/ui && npm run lint`

## Troubleshooting
- Vercel build fails with "No entrypoint found": confirm Root Directory is `apps/ui` and Framework Preset is Next.js.
- Render build fails with "Root directory does not exist": confirm Root Directory is `apps/api`.
- UI shows "Error: Load failed": verify `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy.
- CORS errors from API: ensure `BHP_CORS_ORIGINS` is a JSON list string.
- Free tier cold starts: Render can take 30-60s to wake on first request.
