# BHP Management Console Application
## Architecture Document (Agentic AI Edition)

### Document status
- Version: v0.4
- Scope: Local-first web application running on a laptop initially, designed to evolve to cloud-hosted components later.
- Key change from v0.3: added conversational site builder and agentic execution/testing for site updates.

---

## 1. Vision and scope

### 1.1 Vision
A web application that helps automate and manage the core functions of a small photography business:
- Website creation and publishing
- Website portfolio freshness management
- Social marketing automation (Facebook, Instagram, others later)
- Paid advertising planning and execution (Meta first, Google second)
- Blog drafting and promotion
- Internal activity journal (notes + best photos) to fuel content recommendations
- Contact management (CRM) + inbound inquiry handling + proposal drafting
- Simple finance tracking + tax-category expense reporting

### 1.2 Core principles
- Local-first: runs on a laptop with minimal setup.
- Human-in-the-loop automation: nothing posts/sends/publishes/spends by default without approval.
- Agentic where it helps: agents plan and execute multi-step tasks with tool use, but are constrained by policy.
- Modular boundaries: start as a modular monolith but preserve clean interfaces for later service extraction.
- Connector-based integrations: external systems are accessed only through schema-validated tools.

### 1.3 Out of scope (for early versions)
- Full e-commerce / online payments
- Full accounting suite (invoicing, double-entry accounting)
- Fully autonomous behavior that violates platform terms of service

---

## 2. Requirements drivers

### 2.1 Key functional drivers (from story map)
- MVP: AI image classification pipeline, photo library workflow (upload -> tag -> roles), AI website generation with iterative feedback, staging deploy and publish governance.
- V1: journal-driven recommendations, SEO helpers, client intake forms, improved reporting.
- V2+: paid ads automation and "free ads" group posting with rules awareness.
- Primary complexity: agentic website updates from natural language must map to templates, apply safe changes, and run automated checks.

### 2.2 Quality attributes
- Reliability: scheduled tasks should run predictably with retries.
- Safety: approvals, audit logs, budget enforcement, and rollback where possible.
- Maintainability: modular design, testable connectors and tools.
- Portability: Docker-based local deployment; cloud migration path.

---

## 3. High-level architecture

### 3.1 Architecture style
- Modular monolith (initial) with a dedicated Agent Runtime and Tool Gateway.
- Background job system for scheduled and long-running agent sessions.
- Database + photo storage + optional vector store for semantic retrieval.
- AI pipelines for image tagging and site generation with versioned outputs.

### 3.2 System context
- External systems:
  - Hosting (GoDaddy SFTP/FTP or similar)
  - Meta platforms (Facebook Pages, Instagram, Meta Ads)
  - Google Ads
  - Email provider (Gmail API or IMAP)
  - Optional analytics (Google Analytics)

### 3.3 Logical diagram (Mermaid)
> Note: This Mermaid is written to avoid semicolons and other syntax that commonly breaks in some Markdown editors.

```mermaid
flowchart LR
  User["Brian - Browser"] --> UI["Web UI (Agent Inbox + Editors)"]
  UI --> API["API Server (Domain + Auth + Policy)"]

  API --> DB[(Postgres or SQLite)]
  API --> FS["Photo Storage (Filesystem or MinIO)"]
  API --> VEC["Vector Store (pgvector or Qdrant)"]

  API --> AR["Agent Runtime (Orchestrator)"]
  AR --> PE["Policy and Guardrails"]

  AR --> Q["Agent Job Queue and Scheduler"]
  Q --> W["Workers (Agent Sessions and Pipelines)"]

  PE --> TG["Tool Gateway (Schema Validated Tools)"]

  TG --> META["Meta APIs"]
  TG --> GADS["Google Ads APIs"]
  TG --> EMAIL["Email APIs (Gmail or IMAP)"]
  TG --> HOST["Hosting Deploy (SFTP or FTP)"]
  TG --> BROWSER["Playwright Assistive Automation"]

```

## 4. Component architecture

## 4.1 Web UI

### Responsibilities

- Dashboards: content calendar, leads inbox, tasks, spend snapshots.
- Editors: website pages, blog drafts, post drafts, templates, client proposals.
- Agent Inbox:
  - view agent plans before execution
  - approve or reject high-impact actions
  - see run logs and outcomes
- Photo library workflow:
  - upload and preview assets
  - review AI tags and manual tags
  - assign roles (hero_main, logo, showcase, gallery, social)
  - manage publish status for roles
- Website generation workflow:
  - select templates
  - generate site drafts
  - provide iterative feedback via conversation
  - view agent run status and test results
  - deploy to staging and review

### Suggested admin routes (scaffolding)

- `/admin/photos` -> upload, tag review, roles, publish state
- `/admin/site-builder` -> conversational UI + change requests
- `/admin/site-builder/versions` -> site version history and diffs
- `/admin/site-builder/runs` -> agent runs, logs, and outputs
- `/admin/site-builder/tests` -> automated test results and staging status

### Recommended stack

- Next.js (React)
- Rich text editor: TipTap or similar

------

## 4.2 API Server

### Responsibilities

- Domain logic:
  - Website pages, templates, site versioning, and publish pipeline
  - Conversational change requests and AI-driven site updates
  - Agent run execution, logs, and automated test results
  - Photo ingestion, tagging, role management, publish constraints
  - CRM and inquiry lifecycle
  - Finance registry (shoots + expenses)
  - Journal entries and recommendation surfaces
- Security:
  - Authentication and authorization
  - Encrypted secrets storage interface
- Governance:
  - Approvals and audit logs
  - Policy enforcement entry points

### Recommended stack

- FastAPI (Python)
- Pydantic models for schema validation
- SQLAlchemy (or SQLModel) for persistence

### Suggested API surface (scaffolding)

- `GET /api/v1/site/templates` -> list available templates
- `POST /api/v1/site/generate` -> generate a site draft from template + tags
- `POST /api/v1/site/feedback` -> submit conversational instructions
- `GET /api/v1/site/versions` -> list site versions and status
- `POST /api/v1/site/deploy/staging` -> deploy a version to staging
- `POST /api/v1/site/tests` -> run automated checks on a version
- `GET /api/v1/conversations` -> list builder conversations
- `POST /api/v1/conversations/{id}/messages` -> add user instruction + agent reply
- `GET /api/v1/agent-runs` -> list agent runs and outputs

------

## 4.3 Agent Runtime (Orchestrator)

### Purpose

Enable "agentified" automations that can plan and execute multi-step tasks using tools, while remaining safe and auditable.

### Responsibilities

- Planning:
  - Convert goals into stepwise plans (task decomposition)
  - Choose tools and required inputs
- Execution:
  - Run multi-step sessions with retries and fallbacks
  - Pause for approvals before high-impact actions
  - Record step-by-step outcomes
  - Execute site change requests and generate updated site versions
  - Run automated checks/tests and report results
- Memory:
  - Retrieve relevant context (brand voice, past posts, journal notes, templates)
  - Store outcomes for later use
- Safety:
  - Never directly access external systems
  - Must call tools via the Tool Gateway
  - Must comply with Policy and Guardrails decisions
  - Ask clarifying questions when user instructions do not fit a template safely

### Suggested agent roles (can start as one, split later)

- ImageClassifierAgent
- WebsiteAgent (generation and iteration)
- MarketingAgent
- CRMConciergeAgent
- FinanceClerkAgent
- BrandGuardianAgent

### OpenAI-first model usage (recommended routing)

- Planner model: strong reasoning for planning and tool selection
- Writer model: efficient content drafting (captions, emails, blog drafts)
- Vision model: image tagging and selection guidance
- OpenAI APIs power vision tagging, planning, and site-generation instructions

------

## 4.4 Tool Gateway (Schema-validated tools)

### Purpose

Provide a single controlled interface between agents and the rest of the system.

### Responsibilities

- Expose tools with strict input and output schemas
- Validate inputs and enforce safe defaults
- Add auditing for every tool call
- Apply policy checks for risky actions

### Example tool set

- Website
  - `website.generate_from_template(template_id, constraints)`
  - `website.apply_feedback(site_version_id, instructions)`
  - `website.run_checks(site_version_id)`
  - `website.diff_versions(source_version_id, target_version_id)`
  - `website.preview_patch(page_id, patch)`
  - `website.deploy_to_staging(site_version_id)` (approval gated)
  - `website.publish(site_version_id)` (approval gated)
- Photos
  - `photos.import(paths)`
  - `photos.tag_auto(asset_ids)`
  - `photos.tag_manual(asset_id, tags)`
  - `photos.set_roles(asset_id, roles)`
  - `photos.set_role_published(asset_id, role, is_published)`
  - `photos.set_focal_point(asset_id, x, y)`
  - `photos.rate(asset_id, rating)`
  - `photos.search(tags, rating_min, roles, location, season)`
  - `photos.generate_derivatives(asset_ids, ratios)`
- Social
  - `social.create_draft(channel, caption, asset_ids)`
  - `social.schedule(draft_id, schedule_time)`
  - `social.publish(draft_id)` (approval gated)
- Email
  - `email.ingest_inbox()`
  - `email.draft_reply(inquiry_id, tone)`
  - `email.send(draft_id)` (approval gated)
- Ads
  - `ads.propose_campaign(budget, geo, objective)`
  - `ads.launch(campaign_id)` (approval gated)
- Automation runner
  - `browser.open_prefilled_post(target, content)` (approval gated)

------

## 4.5 Policy and Guardrails (Policy Engine)

### Purpose

Enforce rules outside the model so the system remains safe, predictable, and compliant.

### Responsibilities

- Approval rules:
  - Always require explicit approval for send, post, publish, and launch ads by default
- Budget enforcement:
  - monthly cap
  - per-campaign cap
  - hard blocks when limits exceeded
- Asset governance:
  - enforce exactly one published hero_main
  - prevent deletion of published logo/showcase assets; require replacement
- Site governance:
  - require automated checks to pass before staging promotion
- Compliance constraints:
  - disallow actions likely to violate platform terms
  - restrict automation to assistive mode where necessary
- Content constraints:
  - avoid repetitive spammy phrasing
  - require inclusion of key disclaimers or booking details (optional templates)

### Outputs

- Allow, deny, or require approval
- Provide reason codes to show in the UI

------

## 4.6 Background workers and Scheduler

### Responsibilities

- Run scheduled agent jobs (weekly recommendations, seasonal campaign planning)
- Execute long-running pipelines (image tagging, derivative generation, site generation, automated checks, report generation)
- Retry transient failures and record final outcomes

### Recommended stack

- MVP: APScheduler + DB-backed job table
- Scale-up: Celery or RQ + Redis

------

## 4.7 Data storage

### 4.7.1 Primary DB

- MVP local: SQLite
- Recommended: Postgres (local via Docker)

Stores:

- Contacts, inquiries, message threads
- Shoots, expenses, categories
- Website pages, templates, site versions, deployments
- Conversational instructions, agent runs, and test results
- Social drafts, schedules, results snapshots
- Ads proposals, campaigns, spend snapshots
- Approvals and audit events
- Tool call logs (inputs, outputs, timestamps, correlation IDs)

### 4.7.2 Photo storage

- MVP: local filesystem managed by the app
- Optional: MinIO for S3-like semantics locally

Strategy:

- Originals stored in a local library (e.g., `storage/library/originals/`) with stable asset IDs
- Derived variants stored separately (e.g., `storage/library/derived/`) by ratio, size, and format
- Common ratios for site assets: 3:2 (4x6), 5:7, 1:1, with focal points used for smart crops
- DB stores tags (AI + manual), roles (hero_main, logo, showcase, gallery, social) with published flags, ratings, focal points, usage history, and derived variants
- DB stores site placements and slot assignments for hero, logo, gallery, and showcase sections

### 4.7.3 Vector store (optional but recommended)

Purpose:

- RAG retrieval for brand voice, FAQs, journal notes, past campaigns
  Options:
- pgvector inside Postgres
- Qdrant

------

## 4.8 Integrations ("Connectors")

### Connector approach

- Connectors live behind the Tool Gateway
- Each connector implements a stable internal contract

Connectors:

- Meta: Facebook Pages, Instagram, Meta Ads
- Google Ads
- Email: Gmail API or IMAP
- Hosting deploy: SFTP or FTP

Token handling:

- OAuth tokens stored encrypted at rest
- Health checks to detect expired tokens and permission loss

------

## 4.9 Playwright Assistive Automation

Use case:

- Only when APIs do not support desired workflows

Rules:

- Must be human-in-the-loop by default
- Must capture screenshots and logs for debugging
- Prefer open and prefill rather than fully click Post automation

Isolation:

- Separate worker container or process

------

## 5. Domain model (conceptual)

### Core entities

- Contact
- Inquiry
- Shoot
- Asset (Photo)
- AssetTag
- AssetRole (with published state)
- AssetVariant
- SiteTemplate
- SiteVersion
- SiteDeployment
- SitePlacement
- SiteChangeRequest
- SiteTestRun
- Conversation
- ConversationMessage
- AgentRun
- WebsitePage
- BlogPost
- SocialPost
- Campaign (Ads)
- Expense
- Approval
- AuditEvent
- ToolCallLog

------

## 6. Key workflows (agentic)

### 6.1 Seasonal marketing campaign (agent-run)

1. Brian sets budget, geo, and timeframe
2. Agent proposes a plan:
   - website updates
   - post schedule
   - optional boosts or ads
   - optional community group drafts
3. Policy engine flags which steps require approval
4. Brian approves steps
5. Agent executes via tools, logs outcomes, and reports results

### 6.2 Inquiry intake to booking

1. Inbound inquiry arrives (form or email)
2. System creates Inquiry and links Contact
3. Agent drafts reply and proposes next steps
4. Brian approves send
5. If booked:
   - agent drafts proposal email
   - creates Shoot record
   - optionally triggers intake form

### 6.3 Journal entry to content recommendations

1. Brian logs a journal entry with selected photos
2. System indexes notes and assets (optional vector embedding)
3. Weekly agent job proposes:
   - website refresh actions
   - social post candidates
   - blog topic candidates
4. Brian approves and agent executes

### 6.4 Image upload to site generation

1. Brian uploads images to the library
2. AI tagging pipeline generates tags + confidence scores
3. Brian reviews, edits tags, assigns roles (hero_main, logo, showcase, gallery)
4. System generates a site draft from a selected template
5. Brian provides feedback via conversation; AI may ask clarifying questions
6. Agent executes changes, runs automated checks, and records results
7. Brian deploys to staging and reviews
8. Brian promotes to business domain when ready

------

## 7. Security and reliability

### Authentication and secrets

- Local auth (single-user initially)
- Encryption for tokens at rest
- Never store raw credentials in logs

### Spam protection

- Honeypot field, rate limiting, optional CAPTCHA

### Auditability

- Persist approvals and audit events for:
  - publish website
  - send emails
  - post to social
  - launch ads
  - Playwright runs (store screenshot artifacts)

### Resilience

- Idempotent jobs
- Retries for transient connector failures
- Catch-up for scheduled tasks after laptop sleep

------

## 8. Deployment model (local-first)

### 8.1 Local development (current)

- Primary workflow runs on a laptop.
- UI and API run in separate terminals (`make ui`, `make api`).
- Supporting services (Postgres, Redis, Qdrant) run via Docker Compose (`make infra-up`).
- Photo storage lives in `storage/` by default.

### 8.2 Current hosted wiring (staging)

The current hosted setup is a staging deployment used to validate the wiring between UI, API, and DNS.

```mermaid
flowchart LR
  Browser["Browser"] --> DNS["GoDaddy DNS: staging.brianhopkinsphoto.com"]
  DNS --> Vercel["Vercel: Next.js UI (apps/ui)"]
  Vercel --> Render["Render: FastAPI API (apps/api)"]

  GitHub["GitHub: brianhopkins88/bhp-console"] --> Vercel
  GitHub --> Render
```

### 8.3 Hosted configuration details (current)

- Git hosting: GitHub repo `brianhopkins88/bhp-console` with default branch `main`.
- UI hosting: Vercel
  - Root directory: `apps/ui`
  - Framework preset: Next.js
  - Environment variables:
    - `NEXT_PUBLIC_API_BASE_URL=https://bhp-console.onrender.com`
  - Domain: `staging.brianhopkinsphoto.com` (CNAME configured in GoDaddy)
- API hosting: Render (Web Service)
  - Root directory: `apps/api`
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Environment variables:
    - `BHP_CORS_ORIGINS=["https://staging.brianhopkinsphoto.com"]`
  - Health check: `https://bhp-console.onrender.com/api/v1/health`
  - Free tier note: instances can spin down and cold start on first request
- DNS: GoDaddy manages the root domain; staging uses a CNAME to Vercel.

### 8.4 Docker Compose (recommended)

Containers:

- ui (Next.js)
- api (FastAPI)
- worker (jobs and agent sessions)
- db (Postgres)
- redis (if using Celery or RQ)
- qdrant (optional)
- minio (optional)
- playwright-runner (optional)

------

## 9. Technology choices (recommended defaults)

### MVP defaults

- UI: Next.js
- API: FastAPI
- DB: SQLite to start, then Postgres
- Jobs: APScheduler, then Celery or RQ with Redis
- Storage: filesystem, optional MinIO
- Vector: start without, add pgvector or Qdrant when journal grows
- Agents: OpenAI-first with structured tool calling and schema validation

------

## 10. Roadmap mapping

### MVP

- AI image classification pipeline
- Photo import, tagging, role management, derivative generation
- Role-driven website generation and iterative AI feedback
- Staging deploy and preview workflow
- Website generator, preview, deploy (baseline)
- Social drafts and scheduling queue (manual publish first)
- Contact form intake, inquiry list, alerts, draft replies
- Shoots and expenses registry, annual export

### V1

- Journal, weekly recommendations
- SEO helpers and image optimization
- Client intake form and richer CRM history
- Lightweight insights summaries

### V2+

- Paid ads planning and campaign creation via APIs
- Assistive group posting with rules
- Automated anomaly alerts for spend and performance

## 11. Appendix: Suggested repo structure

```
bhp-console/
  apps/
    ui/                   # Next.js
    api/                  # FastAPI
  packages/
    domain/               # Pydantic schemas, domain logic
    agents/               # agent runtime, role prompts, orchestration
    tools/                # tool gateway + schemas
    connectors/           # meta, google, email, hosting
    policy/               # approvals, budgets, compliance rules
    jobs/                 # schedules, workers, pipelines
  infra/
    docker-compose.yml
    migrations/
  storage/
    library/
      originals/          # source files (not in git)
      derived/            # optimized variants (ratios, sizes, formats)
  docs/
    architecture.md
```
