# BHP Management Console

Local-first web app to automate website, marketing, CRM, and finances for Brian Hopkins Photography.

## Structure
- apps/ui: Next.js frontend
- apps/api: FastAPI backend
- packages/*: shared modules (agents, tools, connectors, policy)
- infra: docker compose + local services
- storage: local photo library + derived assets

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

Session notes:
- update `docs/WORKLOG.md` at the end of each session

## Tests
- API: `cd apps/api && pytest`
- UI: `cd apps/ui && npm run lint`
