- - # BHP Management Console
  
    ## Architecture Document
  
    **Version:** 1.1
    **Status:** Approved Architecture (Epics 0–3)
    **Last Updated:** 2025-01-XX
  
    ------
  
    ## Version Log
  
    ### v1.1 (Current)
  
    - Restored **Technology Architecture** section
    - Restored **Application Architecture Diagram** (deployment-oriented)
    - Clarified runtime, storage, and AI integration boundaries
    - Explicitly separated logical vs deployment architecture
    - No functional changes to Epics 0–3 scope
  
    ### v1.0
  
    - Canonical-first architecture finalized
    - Deterministic regeneration contract defined
    - Page-level regeneration formalized
    - Asset locking + graceful substitution added
    - Import → canonicalization pipeline added
    - Conditional taxonomy versioning with alias traceability
    - Policy engine elevated to single mutation chokepoint
    - Safe auto-commit vs approval-required commits introduced
    - Epic 4+ roadmap added
  
    ### v0.5
  
    - Initial modular architecture
    - Template-oriented generation framing
    - Implicit determinism and versioning semantics
  
    ------
  
    ## 1. Purpose and Scope
  
    The BHP Management Console is a **local-first, human-in-the-loop system** for building, managing, and publishing a **personalized photography website** from **canonical structured business state**, not templates.
  
    ### In scope (Epics 0–3)
  
    - Canonical business profile, site structure, and page configuration
    - Image library and global taxonomy
    - Personalized site generation
    - Page-level regeneration and iteration
    - Safe staging, publishing, and rollback
  
    ### Explicitly out of scope (for now)
  
    - CRM
    - Marketing automation
    - Commerce
      (See §14 Epic 4+ Roadmap)
  
    ------
  
    ## 2. Architectural Principles
  
    ### 2.1 Canonical-First
  
    - Canonical structured state is authoritative
    - Generated artifacts are derived and rebuildable
    - No logic depends on rendered output
  
    ### 2.2 Deterministic Canonical Regeneration
  
    - Determinism applies only to:
      - PageConfig JSON
      - SiteStructure JSON
      - Deterministic asset selections
    - HTML/CSS output is not required to be deterministic
  
    ### 2.3 Policy as a Chokepoint
  
    - All canonical mutations pass through policy + invariants
    - Applies equally to UI, agents, and background jobs
  
    ### 2.4 Human-in-the-Loop by Default
  
    - Agents propose changes
    - Humans approve or allow safe auto-commit
    - No silent background mutation
  
    ------
  
    ## 3. Logical Architecture Overview
  
    ```
    [ Web UI ]
       |
       v
    [ API Server ]
       |
       +--> [ Policy & Invariants Engine ] <----+
       |                                        |
       v                                        |
    [ Canonical Versioned Store ]               |
       |                                        |
       v                                        |
    [ Derived Artifact Store ]                  |
                                                |
    [ Agent Runtime ] --> [ Tool Gateway ] ------+
    ```
  
    Supporting services:
  
    - Canonicalizer Service
    - Run Ledger
    - External Publishing Connectors
  
    ------
  
    ## 4. Core Components
  
    ### 4.1 Web UI
  
    - Conversational interface (intent-driven)
    - Advanced structured editors
    - Diff and preview views
    - Approval and publish controls
  
    ### 4.2 API Server
  
    - Canonical state orchestration
    - Versioning and provenance
    - Workflow coordination
    - Single entry point for mutation
  
    ### 4.3 Canonical Versioned Store
  
    - Structured JSON entities
    - Append-only
    - Full lineage and provenance
    - Supports diff and restore
  
    ### 4.4 Derived Artifact Store
  
    - Immutable HTML/CSS/asset bundles
    - Linked to canonical versions
    - Used for preview, staging, publish
  
    ### 4.5 Agent Runtime
  
    - Stateless per run
    - Determinism-aware
    - No direct state mutation
  
    ### 4.6 Tool Gateway
  
    - Only mechanism for mutation
    - Tool categories:
      - Canonical mutation tools
      - Build / preview tools
      - External publishing tools
    - Canonical tools include business profile, site structure, and page config create/approve
    - Read tools available for latest/history queries
    - Tool names (canonical):
      - `canonical.business_profile.create` / `canonical.business_profile.approve`
      - `canonical.site_structure.create` / `canonical.site_structure.approve`
      - `canonical.page_config.create`
      - `canonical.business_profile.latest` / `canonical.business_profile.history`
      - `canonical.site_structure.latest` / `canonical.site_structure.history`
      - `canonical.page_config.latest` / `canonical.page_config.history`
  
    ### 4.7 Policy & Invariants Engine
  
    - Validates every canonical write
    - Classifies commits
    - Enforces publish gates
    - Approval required unless commit_classification is safe_auto_commit
    - Non-tool REST writes must include approval_id when approval is required
  
### 4.8 Canonicalizer Service

- Imports existing generated site artifacts
- Produces baseline canonical state

### 4.9 Starter Site Spec Library (Optional)

- Read-only JSON site specifications used as reasoning inputs
- Matched to business profiles to seed site structure proposals
- Not canonical and never rendered directly
- System operates without these when none exist

------
  
    ## 5. Canonical Domain Model
  
    ### 5.1 Versioned Canonical Entities (Required)
  
    - **BusinessProfileVersion**
    - **SiteStructureVersion**
    - **PageConfigVersion**
  
    Each version includes:
  
    - `id`
    - `parent_version_id`
    - `created_by` (user | agent | job)
    - `source_run_id`
    - `commit_classification`
    - `created_at`
    - `status` (draft | approved | published)
  
    ------
  
    ### 5.2 Conditional Versioning: Taxonomy
  
    - Default: canonical but unversioned
    - Versioned only during **site structure generation**
  
    Supporting entities:
  
    - `Tag` (stable ID)
    - `TagAlias` (old → new)
    - `TaxonomySnapshot`
  
    **Tag renames**
  
    - Alias-preserving
    - Never destructive
    - Old names remain resolvable
  
    ------
  
    ### 5.3 Derived (Non-Canonical) Entities
  
    - `BuildArtifact`
    - `RunLedgerEntry`
    - `ArtifactImportJob`
  
    ------
  
    ## 6. Determinism Contract
  
### 6.1 Deterministic on Replay

- PageConfig JSON
- SiteStructure JSON
- Asset selection state:
  - Locked slots (Hero image, base Logo)
  - Explicit picks (galleries, structure-referenced assets)
  - Tag-based selection rules + TaxonomySnapshot

### 6.2 Non-Deterministic
  
    - Rendered HTML/CSS
    - Copy variants (unless locked)
  
### 6.3 Asset Slot Semantics

- **Locked**: must replay identically (default: Hero image and base Logo)
- **Refreshable**: may reselect on regen using stored rules and TaxonomySnapshot
  
    ### 6.4 Missing Assets
  
    - Graceful substitution
    - Best-fit replacement
    - Logged, never fatal
  
    ------
  
    ## 7. Policy and Invariants
  
### 7.1 Commit Classification

- `safe_auto_commit` (spelling/grammar corrections only)
- `approval_required` (all other canonical changes)
  
    ### 7.2 Invariant Categories
  
    - Brand (logo, hero)
    - Structure (required pages)
    - Content (no placeholders on publish)
    - Assets (derivatives exist, locked preserved)
    - SEO (alt text, meta descriptions)
  
    ------
  
    ## 8. User Interaction Modes
  
    ### Conversational Mode
  
    - Intent-driven requests
    - Agent proposals
    - Preview and approve
  
    ### Advanced Mode
  
    - Structured canonical editing only
    - No HTML/CSS editing
    - Schema + policy validated
  
    ------
  
    ## 9. Core Workflows
  
    ### 9.1 Epic 0 – Import Polished Draft
  
    ```
    Artifact Bundle + Metadata
            |
    [ Canonicalizer Service ]
            |
    Canonical Versions Created
            |
    Baseline Canonical State
    ```
  
    Artifacts are no longer authoritative after import.
  
    ------
  
    ### 9.2 Page-Level Regeneration (Epic 2)
  
    ```
    Select Page
       |
    Agent Proposes Regen
       |
    Deterministic Canonical Output
       |
    Preview Artifact
       |
    Diff + Policy Check
       |
    Auto-Commit or Approval
    ```
  
    ------
  
    ### 9.3 Publishing (Epic 3)
  
    ```
    Validate Canonical State
       |
    Build Immutable Artifact
       |
    Stage
       |
    Publish
       |
    Record Rollback Target
    ```
  
    Rollback uses prior artifact + invariant validation.
  
    ------
  
## 10. AI and Agent Architecture

- Model and prompt pinning per run
- Determinism enforced at canonical layer
- External tool outputs snapshotted
- Run ledger stores prompts/responses and model outputs verbatim to support replay and preview caching
- All writes via Tool Gateway + Policy Engine
  
    ------
  
## 11. Security, Reliability, and Observability

- Full audit trail
- Regeneration diagnostics surfaced in UI
- Partial success allowed with warnings
- Canonical + artifact export guaranteed
- Authentication and credential security:
  - Users stored in DB with salted password hashes (Argon2id/bcrypt)
  - Session tokens are random, stored as SHA-256 hashes, and rotated on login
  - Sessions include expiry, revoke, and last-seen timestamps
  - Admin endpoints require an authenticated session or explicit approval workflow
  - HTTPS enforced; cookies use HttpOnly + Secure + SameSite policy
  - Secrets managed via env/secret store; never committed to repo

    ------
  
    ## 12. Deployment Model
  
    - Local-first execution
    - Optional cloud connectors
    - Immutable artifacts
    - Append-only canonical store
  
    ------
  
    ## 13. Technology Architecture
  
    ### 13.1 Runtime
  
    - Python-based application runtime
    - Local execution by default
    - Optional hosted deployment
  
    ### 13.2 Storage
  
    - Canonical state:
      - Structured JSON
      - SQLite/Postgres-class backing
      - Shared multi-tenant database with strict tenant scoping (no per-tenant isolation yet)
    - Artifact store:
      - File system or object storage
    - Vector store:
      - Retrieval and reasoning only
      - Explicitly non-canonical
      - Incremental updates with full recompute triggers on schema or prompt changes
  
    ### 13.3 AI Integration
  
    - OpenAI APIs via adapters pinned to stable versions
    - Model versions recorded per run
    - No model output authoritative without commit
  
    ### 13.4 External Integrations
  
    - Hosting providers
    - Image processing tools
    - Publishing targets
      (All accessed only via Tool Gateway)
  
    ------
  
    ## 14. Application Architecture Diagram (Deployment-Oriented)
  
    ```
    +----------------------------------------------------+
    |                    Web Browser                     |
    |                                                    |
    |  Conversational UI  |  Advanced Structured UI      |
    +----------------------+-----------------------------+
                           |
                           v
    +----------------------------------------------------+
    |                  API Server                        |
    |                                                    |
    |  Versioning | Workflow | Provenance                |
    |                                                    |
    |     +------------------------------+               |
    |     | Policy & Invariants Engine   |               |
    |     +------------------------------+               |
    +----------------------+-----------------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
    +---------------+           +----------------------+
    | Canonical     |           | Derived Artifact     |
    | Versioned     |           | Store                |
    | Store         |           | (HTML/CSS/assets)    |
    +---------------+           +----------------------+
    
            ^
            |
    +----------------------+
    |   Agent Runtime      |
    |  Stateless runs      |
    |  Run ledger          |
    +----------+-----------+
               |
               v
    +----------------------+
    |    Tool Gateway      |
    +----------+-----------+
               |
               v
    +----------------------+
    | External Systems     |
    +----------------------+
    ```
  
    **Diagram invariants**
  
    - No backdoor writes
    - Agents never mutate state directly
    - Artifacts always derived
    - External systems isolated
  
    ------
  
    ## 15. Forward-Looking Roadmap (Epic 4+)
  
    ### Epic 4 – Multi-Surface Brand Generation
  
    - Landing pages
    - Print layouts
    - Social assets
  
    ### Epic 5 – Marketing Campaigns
  
    - Campaign canonical objects
    - Variant regeneration
    - External publishing
  
    ### Epic 6 – Client & Project Management
  
    - Client profiles
    - Approval workflows
    - Client-specific variants
  
    ### Epic 7 – Monetization & Commerce
  
    - Packages and pricing
    - Licensing metadata
    - Fulfillment integration
  
    ### Epic 8 – Optimization & Insights
  
    - Variant comparison
    - Explainable recommendations
    - Canonical evolution analysis
  
    ------
  
    ## 16. Mermaid Diagrams (Architecture Overview)

    Render this Mermaid script in a Markdown viewer that supports Mermaid.

    ```mermaid
    flowchart LR
      subgraph UI["Admin Console (Next.js)"]
        UIAdmin[Admin UI]
      end

      subgraph API["API (FastAPI)"]
        APIRouter[API Router]
        Tools[Tool Gateway]
        Policy[Policy Engine]
        Auth[Auth + Sessions]
      end

      subgraph Domain["Domain Packages"]
        Canonical[Canonical Versions]
        Intake[Site Intake State]
        Memory[Semantic Memory (pgvector)]
      end

      subgraph Data["Postgres"]
        DB[(Postgres + pgvector)]
      end

      UIAdmin --> APIRouter
      APIRouter --> Auth
      APIRouter --> Tools
      Tools --> Policy
      Tools --> Canonical
      APIRouter --> Intake
      APIRouter --> Memory
      Canonical --> DB
      Intake --> DB
      Memory --> DB
    ```

    ------

    ## 17. Architectural Closure Statement
  
    This architecture **over-specifies correctness, determinism, and governance** while **under-specifying presentation and vendors**, enabling long-term evolution without re-architecture.
  
    Epics 0–3 can be implemented confidently without constraining future expansion.
  
    ------
  
    If you want next, I can:
  
    - Lock this as **Architecture v1.1 (Final)**
    - Expand the **Mermaid diagrams** into full architectural views
    - Generate an **Epic-by-Epic build plan with guardrails**
    - Create **schemas and API contracts for Epic 0**
  
    You now have a **complete, audited, future-proof architecture document**.
