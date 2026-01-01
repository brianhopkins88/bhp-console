# Epic 0 Module Boundaries and Dependency Rules

> NOTE: Archived first-pass Epic 0 document. Superseded by `docs/BHP Management Console Architecture.md` and `docs/BHP Management Console Vision.md`. This file is retained for historical context and is not maintained during the Epic 0 refactor.

This document defines the package boundaries for the agent runtime, tool gateway,
policy engine, and background jobs. It also documents dependency directions so new
modules land in the correct boundary with ownership noted.

## Boundary summary (target state)

| Boundary | Package | Ownership | Responsibilities |
| --- | --- | --- | --- |
| Domain | `packages/domain` | Platform | Core business models, schemas, domain services. |
| Tools | `packages/tools` | Platform | Tool gateway, schemas, tool registry, validation. |
| Policy | `packages/policy` | Platform | Approvals, guardrails, policy evaluation. |
| Agents | `packages/agents` | Platform | Agent orchestration, planning, run execution. |
| Jobs | `packages/jobs` | Platform | Schedulers, workers, pipelines, retries. |
| Connectors | `packages/connectors` | Platform | External system adapters (Meta, email, hosting). |
| UI | `apps/ui` | Product | Admin + public UI. |
| API edge | `apps/api` | Platform | FastAPI entrypoints, wiring, DI, HTTP adapters. |

## Dependency direction rules

Allowed dependency arrows are one-way. No reverse dependencies.

```
UI -> API edge
API edge -> domain, tools, policy, jobs, agents
agents -> tools, policy, domain
tools -> policy, connectors, domain
policy -> domain
jobs -> agents, tools, policy, domain
connectors -> domain
domain -> (no internal deps)
```

Notes:
- `domain` must not depend on any other internal packages.
- `connectors` should not depend on `tools` or `agents`.
- `policy` should not call tools or connectors; it returns allow/deny/approval decisions.
- `tools` can call `connectors`, but should not contain domain business rules beyond input validation.

## Current location vs target

| Current location | Target boundary | Migration note |
| --- | --- | --- |
| `apps/api/app/models` | `packages/domain` | Move SQLAlchemy models and DB schemas. |
| `apps/api/app/schemas` | `packages/domain` | Move Pydantic schemas. |
| `apps/api/app/services` | `packages/domain` | Split into domain services vs tool adapters. |
| `apps/api/app/api` | `apps/api` | Keep as API edge wiring. |

## New module checklist

When adding a new module:
1. Choose the boundary based on responsibility.
2. Ensure imports only point "downstream" per the rules.
3. Add or update `README.md` in the boundary with ownership and scope.

Ownership template for a new module:

```
Owner: Platform
Scope: <one-line description>
Depends on: <list>
Used by: <list>
```
