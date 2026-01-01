# BHP Management Console Application

## Vision

### Document status

- Version: v0.10
- Scope: Local-first web application running on a laptop initially, designed to evolve to cloud-hosted components later.
- Multi-tenant intent: the console will support multiple photography businesses; Brian is the first user and an app developer.
- Key change from v0.8: Rewrote and expanded Epics 1 and 2.
  - Epic 0 updates in support of Epics 1-3
  
    - **Added canonical state versioning**
  
      - Business profiles, site structures, and pages are versioned canonical objects
      - Topic taxonomy is canonical and versioned only as snapshots during site structure generation
  
      **Introduced deterministic regeneration guarantees**
  
    - Agent runs are fully logged, replayable, and scoped
    - Locked vs refreshable asset slots formalized (Hero image and base Logo are locked by default)
    - Tag-based selection rules are stored with taxonomy snapshots for replayable regeneration
  
      **Formalized invariant enforcement**
  
    - Hero and Logo requirements are enforced by the policy engine, not UI logic
  
      **Clarified starter site descriptions**
  
    - Treated as optional, read-only reasoning inputs, not templates
    - System operates without them when none exist
  
      **Strengthened Epic 0’s role**
  
      - Explicitly positioned as the foundation for Epics 1–3 intelligence and publishing workflows
  - Epics 1 and 2 rewrite:
  
    - ❌ Removed template-driven framing
    - ✅ Elevated business intelligence and hybrid strategy
    - ✅ Clarified user vs. system authority
    - ✅ Formalized page-level regeneration as a core capability
    - ✅ Positioned Epics 1 & 2 as the **personalization engine** of the app
- Status: Epic 0 refactor underway to align with Architecture v1.1 and updated Epics 1–2. 

Below is a vision-level user story set (organized as epics -> user stories) written as build specs with acceptance criteria so an AI or developer can derive tests.

## Personas

- **Brian (Owner/Photographer, first user)** manages everything end-to-end and wants automation + simple controls.
- **Other photographers (tenant users)** manage their own businesses and publish their own websites through the console.
- **Prospective Client** wants easy inquiry, clear options, and confidence they will get a fast response.
- **Returning Client** wants quick rebooking and familiarity (preferences remembered).

------

## Epic 0 Architecture Migration for Agentic Workflows

### Epic Intent

Epic 0 establishes the **foundational architecture required for safe, deterministic, agent-driven workflows** across Epics 1, 2, and 3.

This epic does **not** implement business logic or site features. Instead, it guarantees that:

- Agents can reason over durable, versioned state
- Human-in-the-loop approvals and invariants are centrally enforced
- Regeneration and publishing workflows are predictable, auditable, and reversible
- Later epics can evolve without architectural rework

Epic 0 is the **enabling layer** for business intelligence, image semantics, site generation, and publishing.

### Architecture assessment and migration plan

**As Brian, I want** a clear architecture migration plan
**So that** the current codebase is ready for agent-driven site creation, regeneration, and publishing.

- **[AC-0.01]** Given the existing codebase, when Epic 0 completes, then a written gap analysis maps current modules to the target architecture (domain state, agents, tools, policy engine, jobs, UI).
- **[AC-0.02]** Given the migration plan, when the code is updated, then the repository has clear module boundaries for:
  - Agent runtime
  - Tool gateway
  - Policy and invariant enforcement
  - Background jobs
  - UI adapters

------

### Agent runtime, memory, and replayability

**As Brian, I want** agents with durable memory and replayable execution
**So that** business understanding, site generation, and regeneration are reliable and debuggable.

- **[AC-0.03]** Given a business profile or site state, when it is stored, then agents can retrieve and reuse it across sessions and runs.
- **[AC-0.04]** Given an agent run, when it executes, then it logs:
  - Inputs
  - Constraints
  - Plan
  - Tool calls
  - Outputs
    with a stable run ID.
- **[AC-0.08]** Given a regeneration request, when an agent executes, then the full set of inputs and constraints is logged and replayable to ensure deterministic regeneration.

------

### Canonical state and versioning (New)

**As Brian, I want** all business and site inputs treated as canonical, versioned state
**So that** regeneration, rollback, and future business evolution are safe.

- **[AC-0.07]** Given business profiles, image libraries, site structures, or page configurations, when they are saved, then the system persists them as versioned canonical state objects with change history.
- **[AC-0.07a]** Given a prior version of canonical state, when requested, then the system can restore or branch from that version without affecting published output.
- **[AC-0.07b]** Given topic taxonomy updates, when they are saved, then the taxonomy remains canonical and unversioned by default; when a site structure is generated or regenerated, a TaxonomySnapshot is captured and linked to the resulting canonical versions.

------

### Deterministic selection and slot locking (New)

**As Brian, I want** deterministic asset selection rules and locked slots
**So that** regeneration is predictable without sacrificing personalization.

- **[AC-0.08a]** Given a PageConfigVersion or SiteStructureVersion that uses tag-based selection rules, when it is saved, then the rule and its TaxonomySnapshot are stored together to allow deterministic replay.
- **[AC-0.08b]** Given a regeneration request, when it executes, then locked asset slots are preserved by default (Hero image and base Logo) while refreshable slots may reselect using the stored rules.

------

### Tool governance, policy engine, and invariants

**As Brian, I want** centralized enforcement of rules and invariants
**So that** invalid states are never committed by agents or UI actions.

- **[AC-0.05]** Given a site change request, when an agent applies it, then all tool calls are schema-validated and policy-checked before execution.
- **[AC-0.06]** Given approvals are required, when an agent proposes a risky or destructive action, then explicit approval is enforced before proceeding.
- **[AC-0.06a]** Given commit classification, when a change is limited to spelling or grammar corrections, then it may be safe_auto_commit; all other canonical changes require approval.
- **[AC-0.09]** Given system-defined invariants (e.g., at least one Hero image and one Logo image), when any user or agent action would violate them, then the policy engine blocks the action and returns corrective guidance.

------

### Starter site descriptions (Data-driven reasoning inputs)

**As Brian, I want** the system to safely use internal starter site descriptions
**So that** agents can accelerate reasoning without introducing rigid templates.

- **[AC-0.10]** Given internal starter site description files (e.g., JSON), when agents reference them, then:
  - They are treated as read-only reasoning inputs
  - They are never rendered directly without agent modification
  - The resulting site description is always agent-generated and personalized
  - If no starter site descriptions exist, the system proceeds using only the business profile and canonical state

------

### Operational readiness for staging and publishing

**As Brian, I want** site generation and publishing wired to staging, validation, and rollback
**So that** AI-driven changes remain safe.

- **[AC-0.11]** Given a staged site deployment, when it completes, then the system records deployment metadata and a rollback target.
- **[AC-0.12]** Given a failed validation or policy violation, when detected, then staging or publishing is blocked with actionable feedback.

------

### Epic 0 Exit Criteria (Clarified)

Epic 0 is complete when:

- Agents operate over versioned canonical state
- Regeneration is deterministic and replayable (locked slots + tag rules with snapshots)
- System invariants are centrally enforced
- Starter site descriptions are safely governed and optional
- Staging and rollback are reliable



## Epic 1: Business Intelligence, Image Semantics, and Foundational Tagging

### Epic Intent

Enable the system to **deeply understand a photographer’s business, positioning, and creative identity**, then construct a **semantically rich image library** that supports personalized site generation.

This epic establishes the **first canonical version** of the business and website, while explicitly supporting **future revision hooks** as the business evolves.

------

### Epic 1.1 – AI-Guided Business Description (Living Profile: First Pass)

**As a photographer, I want** the system to guide me through describing my business in my own words
**So that** the system can infer my services, audience, positioning, and site needs without forcing rigid categories.

#### System Behavior

- The system conducts a **conversational, adaptive interview**
- Questions are primarily **open-ended**, captured as free text
- Follow-up questions adapt based on prior answers

#### Business Signals Collected (Examples)

- Current and desired clients
- Photography niches (revenue vs. passion)
- Services, products, or both
- Pricing and delivery model
- Differentiation and credibility (years, certifications, notable clients)
- Personal style and aesthetic preferences
- Optional inspiration inputs (URLs or screenshots of admired sites)

#### Acceptance Criteria

- **[AC-1.01]** Given a new site setup, when the interview runs, then it captures free-text responses across business, creative, and commercial dimensions.
- **[AC-1.02]** Given partial or ambiguous responses, when detected, then the system asks clarifying follow-ups.
- **[AC-1.03]** Given completion, when the interview ends, then a raw business profile is stored as versioned input.

------

### Epic 1.2 – Business Profile Synthesis & Strategy Inference

**As a photographer, I want** the system to summarize and interpret my business description
**So that** I can confirm or correct how the system understands my work.

#### System Behavior

The AI:

- Produces a plain-language business summary
- Infers:
  - Primary and secondary niches
  - Service-led vs. portfolio-led emphasis
  - Likely hybrid strategy (if applicable)
- Flags low-confidence inferences explicitly

#### Acceptance Criteria

- **[AC-1.04]** Given the business profile, when synthesis runs, then the system presents a readable summary plus inferred signals.
- **[AC-1.05]** Given user corrections, when submitted, then the system updates the inferred understanding before proceeding.

------

### Epic 1.3 – Image Upload and Topic Auto-Tagging

**As a photographer, I want** to upload my portfolio and have images automatically tagged by subject
**So that** my image library is usable without manual tagging from scratch.

#### System Behavior

- Supports bulk image upload
- Auto-tagging runs only when the user opts in
- Automatically assigns **Topic tags only**
  - Subject, environment, mood, time/light (when detectable)
- Provides confidence scores for review
- Unknown tags are captured as pending taxonomy candidates

#### User Control

- Users may:
  - Add, remove, or rename Topic tags
  - Review and approve pending taxonomy candidates
- Topic taxonomy is **global per business**, not page- or gallery-scoped; snapshots are captured only when generating site structure

#### Acceptance Criteria

- **[AC-1.06]** Given uploaded images and opt-in auto-tagging, when auto-tagging runs, then topic tags are assigned from the approved taxonomy and unknown tags are stored as pending candidates.
- **[AC-1.06a]** Given pending taxonomy candidates, when the user reviews them, then approvals promote tags into the global taxonomy and rejections are retained for audit.
- **[AC-1.07]** Given manual edits, when saved, then topic tags persist and update search and selection logic.

------

### Epic 1.4 – Role, Service, and Branding Signals (User-Editable with Guardrails)

**As a photographer, I want** to apply meaningful signals to my images
**So that** the system understands which images matter most.

#### User Actions

- Assign or modify **Role tags** (e.g., Hero, Feature, Support)
- Assign or modify **Service tags**
- Select:
  - At least one **Hero image**
  - At least one **Logo image**
- Optionally “star” Feature images

#### System-Enforced Invariants

- The system **must always enforce**:
  - ≥ 1 Hero image
  - ≥ 1 Logo image
- If a required asset is removed, the system blocks progression and prompts replacement.

#### Acceptance Criteria

- **[AC-1.08]** Given Role or Service edits, when applied, then system invariants are continuously validated.
- **[AC-1.09]** Given an invalid state (no Hero or Logo), when detected, then progression is blocked with corrective guidance.

------

#### **Epic 1 Output**

- Living business profile (v1)
- Global topic taxonomy
- Curated, semantically tagged image library
- Valid Role, Service, Hero, and Logo signals

------

## Epic 2: Personalized Site Structure Generation and Staged Website Assembly

### Epic Intent

Transform business intelligence and image semantics into a **visually polished, personalized website draft** that the user can review and refine page by page in a staging environment.

This epic explicitly **rejects template-driven site creation** in favor of **agent-reasoned personalization**, while allowing optional starter site descriptions as internal accelerators when available.

------

### Epic 2.1 – Site Structure and Strategy Proposal

**As a photographer, I want** the system to propose a site structure that reflects my business and goals
**So that** my website tells a clear, compelling story.

#### System Behavior

Using Epic 1 outputs, the system:

- Proposes:
  - Page hierarchy and navigation
  - Galleries and service groupings
- Selects a strategic framing:
  - Single-niche
  - Hybrid with core identity
  - Anchor niche with secondary services
  - Hub-style separation (when niches diverge strongly)

#### Starter Site Descriptions (Internal)

- The system may reference internal **starter site description files** (e.g., JSON)
- These are **inputs to agent reasoning**, not fixed templates
- Agents modify and personalize the structure before presentation
- If none exist, the system generates structure directly from the business profile and canonical state

#### Acceptance Criteria

- **[AC-2.01]** Given business synthesis, when structure generation runs, then a proposed site map with rationale is produced.
- **[AC-2.02]** Given hybrid businesses, when detected, then the proposal explicitly explains the chosen strategy.

------

### Epic 2.2 – User Review and Controlled Edits

**As a photographer, I want** to adjust the proposed structure before site generation
**So that** the site reflects my intent.

#### User Permissions

- Users may:
  - Add, remove, or reorder pages
  - Edit page descriptions
  - Modify Role and Service assignments
  - Modify Topic tags
- Users may **not** violate system invariants (Hero/Logo requirements)

#### Acceptance Criteria

- **[AC-2.03]** Given requested edits, when applied, then the system revalidates structure and tags before committing.
- **[AC-2.04]** Given approval, when confirmed, then the structure becomes the canonical input for generation.

------

### Epic 2.3 – Staged Website Generation (No Templates)

**As a photographer, I want** a complete draft website generated for review
**So that** I can see my site as a real, navigable experience.

#### System Behavior

- Generates a React-based site in a staging environment
- Automatically:
  - Selects images using Role, Service, and Topic tags via stored selection rules
  - Captures selection rules alongside a TaxonomySnapshot for deterministic replay
  - Assigns Hero and Feature placements (Hero and base Logo are locked by default)
  - Builds galleries dynamically
- Output is a **visually polished draft**, not a wireframe

#### Acceptance Criteria

- **[AC-2.05]** Given approved inputs, when generation runs, then a staged site URL is produced with full navigation.
- **[AC-2.05a]** Given tag-based selection rules, when generation runs, then PageConfigVersion and SiteStructureVersion store the rules and TaxonomySnapshot used for deterministic regeneration.

------

### Epic 2.4 – Page-Level Review and Regeneration Loop

**As a photographer, I want** to refine my site page by page
**So that** I stay in control without manual coding.

#### UI Model

- Main area: browser-like preview
- Sidebar (per page):
  - Natural-language change instructions
  - Image picker (add/remove images)
  - Regenerate button

#### Regeneration Rules

- Regeneration applies **only to the active page**
- Must respect:
  - Locked Hero and base Logo assets
  - User-assigned Role and Service tags
- Refreshable slots may reselect using stored tag rules and the captured TaxonomySnapshot
- AI decides layout, image usage, and decorative vs. gallery placement

#### Acceptance Criteria

- **[AC-2.06]** Given page feedback, when regeneration runs, then only the active page is updated.
- **[AC-2.07]** Given multiple iterations, when reviewing, then prior versions remain restorable.

------

#### **Epic 2 Output**

- Visually polished, staged website draft
- User-approved structure and imagery
- Stable foundation for publishing (Epic 3)

------

## Epic 3: Publishing the website

- **Pre-publish review and hosting setup**
  - **As Brian, I want** a final AI review and hosting setup flow **so that** publishing is safe and complete.
    - Acceptance:
      - [AC-038] Given a site version marked ready, when the system runs a publish review, then it checks code quality, page integrity, and build/test status.
      - [AC-039] Given issues or ambiguity, when the system detects them, then it asks final clarifying questions and blocks publish until resolved.
      - [AC-040] Given a publish intent, when the system prompts for hosting data (domain, DNS, credentials), then it validates connectivity and permissions.

- **Publish + rollback**
  - **As Brian, I want** a guided publish with rollback **so that** I can go live confidently.
    - Acceptance:
      - [AC-041] Given approval, when I publish, then the system deploys to the live domain and confirms health checks.
      - [AC-042] Given a host that cannot be automated, when I publish, then the system produces a step-by-step manual checklist with required artifacts.
      - [AC-043] Given a publish or rollback action, when it completes, then the system records deployment metadata, preserves the prior live version, and allows rollback.

- **Example:** "Run the pre-publish review, supply domain credentials, approve the final publish, and verify the live site."

------

## Epic 4: Social marketing automation

- **Post creation**
  - **As Brian, I want** AI-generated post drafts per channel (Facebook, Instagram, others later) **so that** each post fits the platform.
    - Acceptance:
      - [AC-044] Given a channel, when I request a draft, then the system generates channel-appropriate copy.
  - **As Brian, I want** the system to suggest image selections from my library **so that** posts are visually strong.
    - Acceptance:
      - [AC-045] Given a draft, when I request image suggestions, then the system selects assets based on tags and rating.

- **Scheduling and publishing**
  - **As Brian, I want** a content calendar with scheduled posts **so that** I can market consistently.
    - Acceptance:
      - [AC-046] Given a schedule, when I save it, then future posts appear on the calendar.
  - **As Brian, I want** posts published via API when available or browser automation when needed **so that** publishing is still automated.
    - Acceptance:
      - [AC-047] Given a scheduled post, when it reaches its time, then the system queues it for publish or manual approval.

- **Review and approval**
  - **As Brian, I want** an approval step before anything posts **so that** I stay in control of brand voice and offers.
    - Acceptance:
      - [AC-048] Given a draft, when I approve, then it moves to scheduled/publish state.

------

## Epic 5: Paid ads and budget management

- **Budget and seasonality planning**
  - **As Brian, I want** to set a monthly/seasonal budget and target area (ZIP/city radius) **so that** ad spend stays constrained and local.
    - Acceptance:
      - [AC-049] Given a budget, when I save it, then it is enforced in campaign creation.
  - **As Brian, I want** an annual "photo-worthy events" calendar template **so that** campaigns align to real booking cycles.
    - Acceptance:
      - [AC-050] Given the calendar, when I select a season, then the system suggests campaigns.

- **Campaign recommendations**
  - **As Brian, I want** the system to recommend campaign types, audiences, and spend splits (Facebook first, Google second) **so that** I get guided decisions.
    - Acceptance:
      - [AC-051] Given a budget and objective, when I request recommendations, then I receive suggested campaigns.
  - **As Brian, I want** the system to propose A/B variations (headline/image/CTA) **so that** performance improves over time.
    - Acceptance:
      - [AC-052] Given a campaign, when I request variations, then at least two variants are generated.

- **Campaign execution and monitoring**
  - **As Brian, I want** campaigns created/launched via API (or guided steps) **so that** setup is not a barrier.
    - Acceptance:
      - [AC-053] Given approval, when I launch a campaign, then the system creates it with the configured budget.
  - **As Brian, I want** simple performance summaries (spend, clicks, leads) **so that** I know what is working.
    - Acceptance:
      - [AC-054] Given running campaigns, when I open reports, then I see spend and lead metrics.

------

## Epic 6: "Free ads" via community group posting

- **Group directory and rules**
  - **As Brian, I want** to maintain a list of Facebook groups and posting rules (days allowed, format, promo limits) **so that** automation stays compliant.
    - Acceptance:
      - [AC-055] Given a group profile, when I save rules, then posting respects those constraints.

- **Automated posting**
  - **As Brian, I want** the system to generate and post group-friendly offers **so that** I can market without paid spend.
    - Acceptance:
      - [AC-056] Given a group, when I request a post, then the system drafts copy that matches the group rules.
  - **As Brian, I want** browser-based posting automation where APIs are not available **so that** it still works end-to-end.
    - Acceptance:
      - [AC-057] Given an approved draft, when automation runs, then the post is submitted in assistive mode.

------

## Epic 7: Blog writing and promotion

- **Blog drafting**
  - **As Brian, I want** AI-assisted blog post outlines and drafts in my brand voice **so that** I can publish consistently.
    - Acceptance:
      - [AC-058] Given a topic, when I request a draft, then the system returns an outline and first draft.
  - **As Brian, I want** to embed curated photo sets into blog templates **so that** posts look polished.
    - Acceptance:
      - [AC-059] Given a draft, when I attach a photo set, then the blog preview shows the embedded gallery.

- **Promotion automation**
  - **As Brian, I want** the system to generate a social promotion pack (FB post, IG caption, short teaser) **so that** each blog gets distributed.
    - Acceptance:
      - [AC-060] Given a blog post, when I request promotion assets, then channel-specific snippets are generated.

------

## Epic 8: Internal activity journal (notes + best photos)

- **Capture and organization**
  - **As Brian, I want** an internal journal to log shoots, scouting trips, and ideas **so that** I build a reusable knowledge base.
    - Acceptance:
      - [AC-061] Given a journal entry, when I save it, then it appears in the journal list with photos attached.
  - **As Brian, I want** to attach my "best selects" to each entry **so that** the system can reuse them for site/social/blog.
    - Acceptance:
      - [AC-062] Given a journal entry, when I attach selects, then those assets are linked to the entry.

- **Recommendations**
  - **As Brian, I want** weekly recommendations for website updates and marketing content from recent journal entries **so that** content creation feels automatic.
    - Acceptance:
      - [AC-063] Given recent entries, when the weekly job runs, then recommendations are created for review.

------

## Epic 9: Contact management (CRM) + inquiry handling

- **Contact database**
  - **As Brian, I want** a contact database for clients and leads **so that** I can track relationships over time.
    - Acceptance:
      - [AC-064] Given a new contact, when I save it, then it is searchable and linked to inquiries.
  - **As Brian, I want** each contact to have history (sessions, preferences, notes, payments) **so that** repeat business is easy.
    - Acceptance:
      - [AC-065] Given a contact, when I open the record, then I see past sessions and notes.

- **Inbound inquiry capture**
  - **As Brian, I want** a spam-resistant contact form on my website **so that** real inquiries reach me without bot noise.
    - Acceptance:
      - [AC-066] Given a submission, when the form passes spam checks, then it creates an inquiry.
  - **As Brian, I want** email monitoring for my business inbox **so that** inquiries do not slip through.
    - Acceptance:
      - [AC-067] Given a new email, when it matches inquiry rules, then an inquiry is created.
  - **As Brian, I want** alerts for new inbound contacts **so that** I respond quickly.
    - Acceptance:
      - [AC-068] Given a new inquiry, when it arrives, then I receive a notification.

- **Drafting and sending responses**
  - **As Brian, I want** response drafting assistance based on the inquiry type **so that** I can reply fast and professionally.
    - Acceptance:
      - [AC-069] Given an inquiry, when I request a draft, then the system produces a reply for approval.
  - **As Brian, I want** an approval step before sending **so that** I control tone and offers.
    - Acceptance:
      - [AC-070] Given a draft, when I approve, then it is sent via the configured channel.

- **Proposal and session planning**
  - **As Brian, I want** a proposal email generator that includes time, location, and instructions **so that** booking is consistent and clear.
    - Acceptance:
      - [AC-071] Given booking details, when I generate a proposal, then the draft includes all required fields.

- **Client intake form**
  - **As Brian, I want** an intake form that collects preferences (style, family details, goals, constraints) **so that** sessions are tailored.
    - Acceptance:
      - [AC-072] Given an intake form, when a client submits it, then their preferences are stored on their contact record.

------

## Epic 10: Simple financial tracking and reporting

- **Shoot registry + income/expenses**
  - **As Brian, I want** each photo shoot to be a record with date, client, package, income, and related costs **so that** I can track profitability.
    - Acceptance:
      - [AC-073] Given a shoot record, when I save it, then income and expenses are included in reports.
  - **As Brian, I want** an expense tracker aligned to standard tax categories **so that** bookkeeping is painless.
    - Acceptance:
      - [AC-074] Given an expense, when I assign a category, then it appears in exports.

- **Reporting**
  - **As Brian, I want** an annual income/expense report export **so that** I can hand it to my accountant.
    - Acceptance:
      - [AC-075] Given a fiscal year, when I export, then the report includes totals by category.
  - **As Brian, I want** monthly snapshots (revenue, spend, net) **so that** I see trends quickly.
    - Acceptance:
      - [AC-076] Given a month, when I view snapshots, then I see revenue and expense totals.

------

## Cross-cutting Epic: Integrations, security, and safety controls

- **Integrations**
  - **As Brian, I want** to connect accounts (Facebook, Instagram, Google Ads, email, hosting) **so that** automation can operate end-to-end.
    - Acceptance:
      - [AC-077] Given valid credentials, when I connect an account, then the system validates and stores the connection.
  - **As Brian, I want** integration health checks (token expired, permissions missing) **so that** automation does not silently fail.
    - Acceptance:
      - [AC-078] Given a broken integration, when a health check runs, then I see an alert with next steps.

- **Control and safety**
  - **As Brian, I want** a global "approval required" setting for posting/sending/publishing **so that** nothing happens unexpectedly.
    - Acceptance:
      - [AC-079] Given approvals enabled, when an agent proposes a risky action, then it requires explicit approval.
  - **As Brian, I want** audit logs for actions taken (what posted, where, when) **so that** I can track activity.
    - Acceptance:
      - [AC-080] Given a tool action, when it completes, then an audit log entry is created.

- **Data management**
  - **As Brian, I want** backups/export of my contacts, posts, finances, and journal **so that** I am not locked in.
    - Acceptance:
      - [AC-081] Given an export request, when it completes, then I can download a structured export.
  - **As Brian, I want** local-first operation on my laptop **so that** I can start without cloud complexity.
    - Acceptance:
      - [AC-082] Given local mode, when I start the system, then it runs without cloud dependencies.

- **Agent runtime + memory**
  - **As Brian, I want** agents with durable memory and tool governance **so that** AI-driven tasks are consistent and safe across the app.
    - Acceptance:
      - [AC-083] Given a user or business profile, when an agent runs, then it can retrieve and reference the stored context in its plan.
      - [AC-084] Given an agent run, when it uses tools, then each tool call is schema-validated, logged, and linked to the run.
      - [AC-085] Given a multi-step task, when the agent encounters uncertainty, then it pauses for clarification before applying changes.

------

## A simple MVP cut (if you want a "start here" slice)

- Architecture migration for agent runtime, tool gateway, and memory
- Site intake conversation + site structure and taxonomy approval flow
- AI image classification pipeline + manual review workflow (topic tags)
- Role-driven website generation from tagged images with feedback loop
- Staging deploy + preview workflow + publish baseline
- Photo library tagging + derivative generation
- Social drafts (manual publish first)
- CRM basics + contact form intake + response drafts
- Shoot registry + expense categories + annual export

## Appendix: Now / Next / Later

- **Now**
  - Architecture migration for agent runtime, tool gateway, and memory
  - Site intake conversation + approved site structure + topic taxonomy
  - AI image classification pipeline (upload -> auto-tag -> review)
  - Role governance (hero_main uniqueness, published logo/showcase replacement rules)
  - Template-based site generation with conversational feedback
  - Staging deploy + review workflow
- **Next**
  - SEO helpers, alt-text generation, and richer template customization
  - Site placement editor for hero/showcase/gallery slots
  - Automation for scheduled gallery freshness updates
- **Later**
  - Social marketing automation, blog drafting + promotion
  - CRM, inquiry automation, and finance reporting
  - Paid ads automation and community group posting
