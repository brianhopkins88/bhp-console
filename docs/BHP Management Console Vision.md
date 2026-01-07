# BHP Management Console
**Normative Reference:** Vision/Architecture v0.13.

## Vision & Requirements

**Version:** v0.13
**Status:** Authoritative Vision Document
**Aligned Architecture:** BHP Management Console Architecture v0.13

------

## 1. Product Vision

The BHP Management Console is an AI-assisted application that enables photographers and small creative businesses to **create, iterate on, and manage a professional website** through structured inputs, semantic understanding of assets, and governed AI-assisted workflows.

The system is designed so that:

- Users never need to design websites from scratch or select rigid templates
- AI assists by reasoning, proposing, and generating — never by acting autonomously
- All meaningful system state is structured, versioned, and auditable
- Websites are always derived from canonical data, not manually edited artifacts
- The application can evolve from single-user use into a multi-tenant platform

The product prioritizes **safety, explainability, and long-term evolvability** over short-term automation.

------

## 2. User Classes and Personas

### 2.1 Application User

**Definition**
An application user is a photographer or small business owner using the system to create and manage their website.

**Goals**

- Establish an online presence quickly
- Iterate on content and structure with AI assistance
- Retain control over branding, messaging, and publishing

**Access**

- Dev / Configure experience
- Staging experience
- No access to agent internals or system configuration

------

### 2.2 Application Administrator

**Definition**
An application administrator configures and governs how AI agents behave within the system.

**Goals**

- Improve output quality and consistency
- Encode best practices as reusable guardrails
- Experiment with agent behavior safely

**Access**

- Administrative configuration modules
- Guardrails management
- Agent prompt inspection and testing tools

------

### 2.3 Additional Personas (Preserved)

The following personas from the original vision remain relevant:

- **Business Owner / Primary Photographer**
- **Secondary Photographer (Team Member)**
- **Prospective Client (Website Visitor)**
- **Returning Client**

These personas inform downstream epics (marketing, CRM, engagement) even when not directly interacting with the application.

------

## 3. Epic 0 – Foundational Architecture for Agentic Workflows

### 3.1 Vision

Epic 0 establishes the **architectural foundation** that enables AI-assisted workflows safely and predictably.

The system must ensure that:

- Canonical data is the sole source of truth
- AI agents propose changes but do not directly mutate state
- All changes are validated, versioned, and reversible
- System behavior is inspectable and explainable

Epic 0 is deliberately infrastructure-heavy because **every future epic depends on it**.

------

### 3.2 Canonical State and Determinism

- Business profiles, site structure, and page configuration are stored as **versioned canonical objects**
- Derived artifacts (HTML, CSS, images) are never authoritative
- Structured configuration and asset selections replay deterministically
- Rendered output is allowed to vary visually

------

### 3.3 Staging as an Application Mode

Staging is **not** a CI/CD environment.

It is:

- A protected application surface
- A fully navigable website derived from canonical state
- A workspace where users request page-level changes

All staging changes flow back into canonical regeneration.

------

### 3.4 Agent Governance and Policy Enforcement

- AI agents reason and propose
- All agent actions pass through a tool gateway
- All canonical mutations pass through a policy and invariants engine
- Approval requirements are enforced before commit
- All activity is logged in a run ledger

------

### 3.5 Epic 0 Extension – Agent Guardrails Module

#### Vision

Guardrails are **first-class configuration assets** that guide AI behavior across tasks.

They:

- Encode best practices
- Reduce undesired variance
- Enable safe experimentation
- Improve consistency without code changes

Guardrails influence agent reasoning but **never override governance**.

------

#### Guardrails Capabilities

The system provides an administrative module that allows application administrators to:

- View all agents and the tools they can invoke
- Inspect and edit base system prompts for each agent
- Create, edit, and delete guardrail statements
- Associate guardrails with specific agent tasks
- Test agent behavior using sample inputs and outputs
- Observe how changes affect agent outputs without impacting user data

Guardrails are retrieved via semantic search and injected into agent prompts at runtime.

------

## 4. Epic 1 – Business Intelligence, Taxonomy, and Asset Semantics

### 4.1 Vision

Epic 1 establishes **semantic understanding** of the business and its assets.

Rather than asking users to design a website, the system:

- Learns what the business does
- Understands visual assets in context
- Establishes a shared vocabulary for reasoning

------

### 4.2 First-Time User Intake Journey

When a new application user signs up:

#### Step 1 – Existing Website Discovery

- The system asks if an existing website exists
- If provided, the site is crawled in the background
- The crawl provides design and content context only

#### Step 2 – Business Profile Questionnaire

- Conversational natural-language intake
- Produces a structured, versioned business profile
- Treated as a living object

#### Step 3 – Image and Identity Intake

The system requests:

- Up to 25 key images (one designated as Hero)
- A logo (or AI-generated logo via interactive module)
- At least one image of the photographer

Afterward:

- The system generates an initial taxonomy
- Tags all images
- Requests up to 100 additional images
- Auto-tags those images

Users may review, modify, create, or delete tags.

------

### 4.3 Tagging and Taxonomy Model

#### Tag Model Evolution (Important Note)

Earlier versions of the vision distinguished between:

- Topic tags
- Service tags
- Role tags

**v0.13 consolidates user-visible tagging into a single taxonomy.**

- Users manage one taxonomy
- System invariants are enforced via reserved tags:
  - `hero`
  - `logo`
  - `photographer`
  - `owner`

Service groupings and layout decisions are inferred by the system using taxonomy and context.

This reduces cognitive load while preserving expressive power.

------

### 4.4 Image Semantics

- Images are auto-tagged using AI
- Embeddings are generated for similarity search
- Tagging is opt-in and reviewable
- Embeddings supplement, not replace, tags

------

## 5. Epic 2 – Site Structure and Staged Website Assembly

### 5.1 Vision

Epic 2 converts semantic understanding into a **real website** without templates.

The system:

- Recommends site structure
- Generates page configurations
- Selects assets semantically
- Builds a navigable staged website
- Supports iterative refinement

------

### 5.2 Site Structure and Pages

- Pages may be nested (e.g., Services → Individual Services)
- Clicking a page reveals:
  - Page title
  - Page text
  - Feature images
  - Functional description (e.g., contact form)
  - Subpages
  - Galleries

------

### 5.3 Asset Selection Rules

- Asset slots may be locked or refreshable
- Locked selections replay deterministically
- Refreshable slots use deterministic rules and tie-breakers
- Missing assets are substituted gracefully

------

### 5.4 Staging Feedback Loop

- Users browse the staged site
- Users request page-level changes
- Requests are converted to structured regeneration intent
- New canonical versions are created
- Staging is refreshed from canonical state only

------

## 6. Epic 3 – Publishing (Vision Only)

### Vision

Epic 3 introduces controlled publishing of an accepted staged site.

- Staging transitions to production
- Vercel is the initial hosting target
- Other hosts may be supported later
- Rollback and version selection are supported
- Manual publishing guidance is available where automation is not possible

------

## 7. Epic 4+ – Future Roadmap (Vision Only)

Future epics include (preserved from original vision):

- Social marketing automation
- Paid advertising workflows
- Community posting
- Blogging and promotion
- Internal business journaling
- CRM and inquiry handling
- Financial tracking and insights

These build on the canonical-first, governed foundation.

------

## 8. Cross-Cutting Requirements

- Audit logging and explainability
- Approval-required settings for risky actions
- Backup and export to prevent lock-in
- Agent clarification when uncertainty is detected
- Health checks and integrations

------

## 9. MVP and Phasing

- MVP focuses on Epics 0–2
- Epic 3 enables publishing
- Epic 4+ expands business operations

------

## 10. Closing Statement

This Vision v0.13 preserves the original intent while aligning fully with Architecture v0.13.

It explicitly defines:

- Who the system is for
- How AI is governed
- How meaning flows from input to website
- How the system can evolve safely over time
