# Epic 0 Migration Backlog

This backlog breaks Epic 0 into actionable work items with dependencies and acceptance tests.
It aligns to `docs/BHP Management Console Vision.md` (AC-001 to AC-006).

## Scope and assumptions

- Scope: architecture migration work that enables Epics 1-3.
- Out of scope: new user-facing features beyond required scaffolding.
- Dependencies: keep the current app running while boundaries are created.

## Backlog items

### E0-01: Architecture inventory and gap analysis

- Description: Document current modules and map them to the target boundaries (domain, agents, tools, policy, jobs, UI).
- Dependencies: none.
- Acceptance tests:
  - Given the current repo, when the analysis completes, then the document lists existing modules and their target ownership.
  - Given the analysis, when gaps are identified, then they are ordered by dependency and risk.

### E0-02: Module boundaries and package layout

- Description: Create clear package boundaries for agent runtime, tool gateway, policy engine, and background jobs.
- Dependencies: E0-01.
- Acceptance tests:
  - Given the new layout, when code is compiled or imported, then boundaries are respected and dependency directions are documented.
  - Given a new module, when it is added, then it lives under the correct boundary with ownership noted.

### E0-03: Agent run tracking and audit trail

- Description: Add a durable agent run record with stable run IDs and tool call logs.
- Dependencies: E0-02.
- Acceptance tests:
  - Given an agent run, when it executes, then the system stores a run record with plan, steps, tool calls, and outcomes.
  - Given tool calls, when they complete, then inputs/outputs are stored with correlation IDs.

### E0-04: Memory store for business profile and site structure

- Description: Persist the business profile, site structure, and topic taxonomy for retrieval across runs.
- Dependencies: E0-02.
- Acceptance tests:
  - Given a business description, when it is saved, then it is retrievable by agents and the site intake UI.
  - Given an approved structure or taxonomy, when it is stored, then it is available to the generator and tagging pipeline.

### E0-05: Tool gateway and policy hooks

- Description: Route agent actions through schema-validated tools and policy enforcement.
- Dependencies: E0-02.
- Acceptance tests:
  - Given a tool call, when it executes, then input/output schemas are validated and logged.
  - Given a policy rule, when a risky action is requested, then approval is required before the tool runs.

### E0-05a: Approval logging (simple MVP)

- Description: Implement a minimal proposal + approval log for agent actions (no state machine yet).
- Dependencies: E0-02.
- Acceptance tests:
  - Given an approval request, when it is created, then it records the proposal, requested action, and requester.
  - Given an approval, when it is granted, then the decision is recorded and tied to the action outcome.

### E0-06: Automated checks and staging gating

- Description: Wire site-change requests to automated checks and block deploys when checks fail.
- Dependencies: E0-03, E0-05.
- Acceptance tests:
  - Given a site change request, when it is applied, then automated checks run and results are stored.
  - Given failed checks, when a staging deploy is requested, then the deploy is blocked and the failure is surfaced.

### E0-07: Staging deploy metadata and rollback target

- Description: Record deployment metadata and preserve rollback targets for staging and live releases.
- Dependencies: E0-05, E0-06.
- Acceptance tests:
  - Given a deploy, when it completes, then a deployment record includes version, time, and environment.
  - Given a new deploy, when it is recorded, then the prior version is preserved as a rollback target.

### E0-08: Hosted architecture alignment (Render + Vercel)

- Description: Align migration steps with the existing Render API/Postgres and Vercel UI setup.
- Dependencies: E0-01.
- Acceptance tests:
  - Given the current staging setup, when migration steps are defined, then they include Render/Vercel environment constraints and upgrade paths.
  - Given deployment steps, when they are executed, then staging remains functional without breaking existing URLs.

### E0-09: Vector store provisioning (semantic memory)

- Description: Provision and wire pgvector for semantic memory, sourced from canonical DB records.
- Dependencies: E0-02, E0-04.
- Acceptance tests:
  - Given a business profile entry, when it is embedded on write, then it is retrievable via vector search.
  - Given a staging environment, when it is configured, then vector retrieval works end-to-end.
  - Given vector data loss, when embeddings are rebuilt from DB records, then retrieval returns expected results.

### E0-10: Taxonomy migration and backfill

- Description: Migrate existing auto-tags and taxonomy candidates into the new topic taxonomy model.
- Dependencies: E0-04.
- Acceptance tests:
  - Given existing tags, when the migration runs, then topic taxonomy entities are created and linked without data loss.
  - Given pending tags, when migration completes, then approval status is preserved.
