# Epic 0 Architecture Inventory and Gap Analysis
**Normative Reference:** Vision/Architecture v0.13.

> NOTE: Archived first-pass Epic 0 document. Superseded by `docs/BHP Management Console Architecture.md` and `docs/BHP Management Console Vision.md`. This file is retained for historical context and is not maintained during the Epic 0 refactor.

This document maps the current repo modules to the target boundaries (domain, agents,
tools, policy, jobs, UI) and highlights gaps, dependencies, and risks.

## Current module inventory (by boundary)

| Area | Current location | Target boundary | Notes |
| --- | --- | --- | --- |
| Web UI (public site + admin) | `apps/ui/src/app` | UI | Admin routes exist for photos and drafts; public site pages are static content. |
| Admin auth middleware | `apps/ui/src/middleware.ts` | UI | Basic auth gate for `/admin`. |
| API routing | `apps/api/app/api` | Domain/API edge | REST endpoints for assets and OpenAI usage only. |
| Domain models | `apps/api/app/models` | Domain | Asset, tags, roles, variants, taxonomy, OpenAI usage. |
| Schemas | `apps/api/app/schemas` | Domain | Pydantic schemas for assets and taxonomy. |
| Domain services | `apps/api/app/services` | Domain | Asset derivatives + OpenAI tagging pipeline + OpenAI usage counters. |
| Database config | `apps/api/app/db` | Domain | SQLAlchemy session + base. |
| Infra (local) | `infra/docker-compose.yml` | Jobs/Data | Postgres, Redis, Qdrant. Qdrant is unused in code. |
| Migrations | `migrations/` | Domain | Only assets/taxonomy/openai usage tables. |
| Storage | `storage/library` | Data | Asset originals + derived variants. |
| Empty package boundaries | `packages/{agents,tools,policy,jobs,domain,connectors}` | Target skeleton | Empty placeholders for target architecture. |

## Boundary mapping (current vs target)

- Domain: `apps/api/app/models`, `apps/api/app/schemas`, `apps/api/app/services`.
- UI: `apps/ui`.
- Agents: missing (placeholder in `packages/agents`).
- Tools (gateway + schemas): missing (placeholder in `packages/tools`).
- Policy (approvals/guardrails): missing (placeholder in `packages/policy`).
- Jobs (scheduler/worker): missing (placeholder in `packages/jobs`).
- Connectors: missing (placeholder in `packages/connectors`).

## Gaps and dependencies (ordered)

1. **Module boundary enforcement**
   - Gap: boundaries exist only as empty folders; current API combines domain + orchestration.
   - Dependency: none; enables all later work.
   - Risk: low, but if skipped, later refactors will be larger.

2. **Agent runtime + tool gateway + policy hooks**
   - Gap: no agent runtime, no tool gateway, no centralized policy enforcement.
   - Dependency: boundary layout for agents/tools/policy.
   - Risk: high; core to Epic 0 acceptance criteria.

3. **Agent run tracking + audit trail**
   - Gap: no AgentRun, ToolCallLog, Approval, AuditEvent models.
   - Dependency: tool gateway + policy placement decisions.
   - Risk: high; required for safety and traceability.

4. **Memory store for business profile + site structure**
   - Gap: no BusinessProfile, SiteStructure, TopicTaxonomy (beyond tag taxonomy).
   - Dependency: domain models + migrations + storage conventions.
   - Risk: medium; needed for Epic 1+ but must be in Epic 0.

5. **Vector store alignment**
   - Gap: infra uses Qdrant, architecture specifies pgvector (Postgres).
   - Dependency: decision on vector store (pgvector vs Qdrant), staging parity.
   - Risk: medium; mismatch could cause rework if not resolved now.

6. **Jobs and automated checks**
   - Gap: no job scheduler, no site change checks, no deploy gating.
   - Dependency: agent runs + tool gateway for checks, deployments.
   - Risk: medium; needed for staging safety.

## Staging constraints to honor

- UI on Vercel, API on Render, Postgres on Render.
- API uses `postgresql+psycopg` in `DATABASE_URL`.
- Staging should remain functional during migration; avoid breaking existing assets endpoints.
