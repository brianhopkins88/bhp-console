# Work Log

## YYYY-MM-DD
- What I worked on:
- Current status:
- Next step:
- Notes/decisions:

## 2025-12-31
- What I worked on:
  - Added admin login page, auth gating, and simplified account settings UI with recovery question support.
  - Added auth recovery fields + endpoints and user ID change endpoint.
  - Updated E0 smoke test to support auth and verified it passes.
- Current status:
  - Admin console requires an auth session; login and recovery flows are in place.
  - Smoke test `smoke-e0-09` passes against the auth-enabled API.
- Next step:
  - Epic 0 vision completion plan:
    - Enforce deterministic regeneration with locked vs refreshable slots (Hero + base Logo locked by default).
    - Ingest optional starter site descriptions (JSON) with governance and immutability rules.
    - Implement system invariants checks (required Hero/Logo) tied to policy gating.
    - Expand staging/rollback workflow beyond metadata (manual checklist + operator flow).
- Notes/decisions:
  - Epic 0 checklist remains marked complete, but the vision exit criteria needs the four items above.

## 2025-12-29
- What I worked on:
  - Reworked site intake flow to Profile → Structure → Taxonomy → Review with resume/autosave, status tracker, and reset controls.
  - Added intake state API + version retention and wired business profile draft/approved tracking.
  - Refined intake UI UX: de-emphasized progress, consolidated reset/reload menu, and moved version history into a drawer.
  - Updated proposal behavior so taxonomy is generated from the approved structure.
- Current status:
  - Intake flow now resumes from saved state, shows step status, and supports version reuse with clear “empty/no changes” handling.
- Next step:
  - Update the architecture doc and AI tagging doc.
  - Rework Epic 0 to align with the revised Epic 1/2 direction.
- Notes/decisions:
  - Vision doc was heavily revised (Epic 1/2 rewritten; Epic 0 updated to support them).

## 2025-12-30
- What I worked on:
  - Added canonical create/approve tools for business profile and site structure.
  - Enforced approval gating on non-tool canonical REST endpoints with approval_id.
  - Documented new canonical tools and smoke target.
  - Updated site intake UI to request approvals for approved writes and mark draft saves safe_auto_commit.
  - Added auth foundation: users/sessions, session cookies, login/logout/password change endpoints, and UI account tools.
- Current status:
  - Canonical mutations require approval unless commit_classification is safe_auto_commit.
- Next step:
  - Run intake flow walkthrough to confirm approvals and auth sessions are being logged correctly.
- Notes/decisions:
  - Canonical REST approval actions: api.site.business_profile.create, api.site.structure.create, api.site.page_config.create.

## 2025-12-27 (later)
- What I worked on:
  - Built Epic 1 site intake proposal + approval endpoints and deterministic proposal builder.
  - Added `/admin/site-intake` UI with prompts, guardrails, proposal review, approval, and structure editor.
  - Added structural change request flow (e.g., group service pages under Services).
  - Integrated topic taxonomy display + quick-add into photo admin; seeded tag taxonomy from intake.
  - Fixed local `make ui` failure by linking icu4c; added `make test-api`.
- Current status:
  - Intake workflow and UI are live; structure change requests are supported.
  - `pytest` passes (1 test); UI lint has warnings (hooks deps, `<img>` usage).
- Next step:
  - Run manual UI walkthrough for intake → approve → photos and fix any issues.
  - Resolve lint warnings and update the vision doc with Epic 1 progress.
- Notes/decisions:
  - Reminder: update `docs/BHP Management Console Vision.md` with Epic 1 progress/details.

## 2025-12-27
- What I worked on:
  - Completed Epic 0 migration items: module boundaries, agent run logging, approval logging, memory store, pgvector wiring, tool gateway + policy hooks, checks gating, and deployment metadata.
  - Added smoke tests for Epic 0 endpoints and ran end-to-end verification.
  - Removed unused Qdrant service from local compose.
  - Documented architecture decisions and vector memory setup.
- Current status:
  - Epic 0 acceptance criteria are met with working smoke tests.
  - Local dev uses pgvector-enabled Postgres; staging has pgvector extension enabled.
- Next step:
  - Start Epic 1 intake and UI workflows.
- Notes/decisions:
  - Multi-user auth deferred to a separate slice.
  - pgvector chosen for semantic memory (see architecture decision log).

## Epic 0 completion checklist
- [x] Architecture inventory + gap analysis documented.
- [x] Module boundaries defined and package scaffolding created.
- [x] Agent runs + tool call logs + approvals persisted.
- [x] Business profile, site structure, topic taxonomy persistence wired.
- [x] Semantic memory (pgvector) wired and smoke tested.
- [x] Tool gateway + policy hooks with approval gating.
- [x] Automated checks wired (DB/storage smoke checks).
- [x] Staging deploy metadata + rollback targets recorded.
- [x] End-to-end smoke tests passing (E0-03/04/05/06/07).

## Epic 0 repo module inventory (update when modules change)

### Tool gateway + policy
- `packages/tools/registry.py`: tool registry, specs, and context; depends on `pydantic`, standard lib.
- `packages/tools/builtins.py`: built-in tool definitions (echo); depends on `packages.tools.registry`, `pydantic`.
- `packages/tools/canonical.py`: canonical tools (page config create + read tools, business profile/site structure reads + create/approve); depends on `packages.tools.registry`, `packages.domain.services.page_config`, `sqlalchemy`, `pydantic`.
- `packages/policy/engine.py`: policy decisions (allow/deny/approval); depends on `packages.tools.registry`.
- `apps/api/app/api/v1/tools.py`: tool execution endpoint, checks gating, deploy recording; depends on `fastapi`, `sqlalchemy`, `pydantic`, `packages.tools`, `packages.policy`, `packages.domain.models.*`, `packages.domain.schemas.tools`.
- `packages/domain/schemas/tools.py`: tool execute request/response models; depends on `pydantic`.
- `apps/api/app/api/deps.py`: API basic auth guard; depends on `fastapi`, `app.core.settings`.

### Agent run tracking + approvals
- `packages/domain/models/agent_runs.py`: AgentRun, AgentStep, ToolCallLog; depends on `sqlalchemy`.
- `packages/domain/models/approvals.py`: Approval records; depends on `sqlalchemy`, `agent_runs`.
- `packages/domain/models/auth.py`: AuthUser, AuthSession; depends on `sqlalchemy`.
- `apps/api/app/api/v1/agent_runs.py`: CRUD for runs/steps/tool calls; depends on `fastapi`, `sqlalchemy`, `packages.domain.models.agent_runs`, `packages.domain.schemas.agent_runs`.
- `apps/api/app/api/v1/approvals.py`: CRUD for approvals + decisions; depends on `fastapi`, `sqlalchemy`, `packages.domain.models.approvals`.
- `apps/api/app/api/v1/auth.py`: login/logout/me/change-password endpoints; depends on `fastapi`, `sqlalchemy`, `packages.domain.models.auth`, `packages.domain.schemas.auth`, `app.services.auth`.
- `packages/domain/schemas/agent_runs.py`: schemas for runs/steps/tool calls; depends on `pydantic`.
- `packages/domain/schemas/approvals.py`: schemas for approvals; depends on `pydantic`.
- `packages/domain/schemas/auth.py`: schemas for auth endpoints; depends on `pydantic`.
- `apps/api/app/services/auth.py`: password hashing + sessions + bootstrap; depends on `passlib`, `sqlalchemy`.

### Site intake memory + semantic retrieval
- `packages/domain/models/site_intake.py`: TopicTaxonomy (canonical global taxonomy); depends on `sqlalchemy`.
- `apps/api/app/api/v1/site_intake.py`: create/read endpoints + embedding on write; depends on `fastapi`, `sqlalchemy`, `app.services.memory`.
- `packages/domain/schemas/site_intake.py`: schemas for intake entities; depends on `pydantic`.
- `packages/domain/models/memory.py`: pgvector-backed MemoryEmbedding; depends on `pgvector`, `sqlalchemy`.
- `apps/api/app/services/embeddings.py`: OpenAI embeddings; depends on `openai`, `httpx`, `app.core.settings`.
- `apps/api/app/services/memory.py`: upsert/search memory; depends on `sqlalchemy`, `pgvector`, `app.services.embeddings`.
- `apps/api/app/api/v1/memory.py`: memory search endpoint; depends on `fastapi`, `app.services.memory`.

### Taxonomy change log
- `packages/domain/models/site_intake.py`: TopicTaxonomyChange append-only change log; depends on `sqlalchemy`.
- `apps/api/app/api/v1/site_intake.py`: taxonomy history + restore endpoints; depends on `fastapi`, `sqlalchemy`.

### Canonical versioned state (Epic 0 refactor)
- `packages/domain/models/canonical.py`: BusinessProfileVersion, SiteStructureVersion, PageConfigVersion, TaxonomySnapshot; depends on `sqlalchemy`.
- `packages/domain/schemas/canonical.py`: schemas for canonical versioned entities; depends on `pydantic`.
- `apps/api/app/api/v1/page_config.py`: page config version endpoints + selection-rule snapshots; depends on `fastapi`, `sqlalchemy`.

### Site ops (checks + deploy metadata)
- `packages/domain/models/site_ops.py`: SiteTestRun, SiteDeployment; depends on `sqlalchemy`.
- `apps/api/app/api/v1/site_ops.py`: CRUD for tests and deployments; depends on `fastapi`, `sqlalchemy`, `packages.domain.models.site_ops`, `packages.domain.schemas.site_ops`.
- `packages/domain/schemas/site_ops.py`: schemas for tests and deployments; depends on `pydantic`.

### Migrations + infra
- `migrations/versions/0006_agent_runs_and_approvals.py`: run + approval tables.
- `migrations/versions/0007_site_intake_memory.py`: intake memory tables.
- `migrations/versions/0008_vector_memory.py`: pgvector memory table + extension.
- `migrations/versions/0009_topic_taxonomy_backfill.py`: taxonomy backfill from legacy tags.
- `migrations/versions/0010_site_ops.py`: test run + deployment tables.
- `migrations/versions/0011_memory_embedding_index.py`: IVFFLAT index for vector search.
- `infra/docker-compose.yml`: pgvector-enabled Postgres for dev.
- `migrations/versions/0013_canonical_versions.py`: canonical versioned state tables + taxonomy snapshots.
- `migrations/versions/0014_topic_taxonomy_changes.py`: append-only topic taxonomy change log.
- `migrations/versions/0015_auth_tables.py`: auth users + sessions tables.

### Smoke tests
- `scripts/smoke_e0_03.sh`: run logging + approvals.
- `scripts/smoke_e0_04.sh`: intake persistence.
- `scripts/smoke_e0_05.sh`: tool gateway + checks + approvals + deploy.
- `scripts/smoke_e0_06_07.sh`: test runs + deployment metadata.
- `scripts/smoke_e0_08.sh`: canonical tool gateway + commit classification approval flow.
- `scripts/smoke_e0_09.sh`: canonical read tools (business profile + site structure).
- `Makefile`: `migrate` + smoke targets (including `smoke-e0-09`).

## Epic 0 code overview (how it fits together)

- **API entrypoint**: `apps/api/app/main.py` mounts `apps/api/app/api/router.py` which registers all v1 routes.
- **Agent run logging**: `app/api/v1/agent_runs.py` writes `AgentRun` / `AgentStep` / `ToolCallLog` rows in `packages/domain/models/agent_runs.py`.
- **Tool gateway**: `app/api/v1/tools.py` looks up tools in `packages/tools/registry.py`, enforces policy via `packages/policy/engine.py`, logs tool calls, and manages approvals.
- **Checks + deploys**: `website.run_checks` writes `SiteTestRun`; `website.deploy` validates latest checks + records `SiteDeployment`.
- **Memory**: `app/api/v1/site_intake.py` persists intake records and calls `app/services/memory.py`, which uses OpenAI embeddings (`app/services/embeddings.py`) and pgvector (`packages/domain/models/memory.py`).
- **Ops records**: `app/api/v1/site_ops.py` provides CRUD for tests and deployments.

Top-level dependencies:
- **API**: FastAPI, SQLAlchemy, Pydantic.
- **AI**: OpenAI SDK + httpx.
- **Images**: Pillow (for tagging pipeline).
- **Vectors**: pgvector (Postgres extension + Python bindings).

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
