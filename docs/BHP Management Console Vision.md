# BHP Management Console Application

## Vision

### Document status

- Version: v0.8
- Scope: Local-first web application running on a laptop initially, designed to evolve to cloud-hosted components later.
- Multi-tenant intent: the console will support multiple photography businesses; Brian is the first user and an app developer.
- Key change from v0.7: recorded Epic 1 implementation progress (intake UI, approvals, topic taxonomy integration, structural change requests).
- Status: Epic 0 complete; Epic 1 intake + tagging workflows are in progress.

Below is a vision-level user story set (organized as epics -> user stories) written as build specs with acceptance criteria so an AI or developer can derive tests.

## Personas

- **Brian (Owner/Photographer, first user)** manages everything end-to-end and wants automation + simple controls.
- **Other photographers (tenant users)** manage their own businesses and publish their own websites through the console.
- **Prospective Client** wants easy inquiry, clear options, and confidence they will get a fast response.
- **Returning Client** wants quick rebooking and familiarity (preferences remembered).

------

## Epic 0: Architecture migration for agentic workflows

Note: Epic 0 prepares the current codebase for Epics 1-3 by aligning it to the agentic architecture, memory needs, and safety controls.

- **Architecture assessment and migration plan**
  - **As Brian, I want** a clear architecture migration plan **so that** the current codebase is ready for agent-driven site creation, tagging, and publishing.
    - Acceptance:
      - [AC-001] Given the existing codebase, when Epic 0 completes, then a written gap analysis maps current modules to the target architecture (domain, agents, tools, policy, jobs, UI).
      - [AC-002] Given the migration plan, when the code is updated, then the repo has clear module boundaries for agent runtime, tool gateway, policy engine, and background jobs.

- **Agent runtime + memory foundation**
  - **As Brian, I want** agent memory and retrieval in place **so that** agents can use business context and prior instructions reliably.
    - Acceptance:
      - [AC-003] Given a business description, when it is stored, then agents can retrieve and reuse it for site structure and service page generation.
      - [AC-004] Given an agent run, when it executes, then it logs plan, tool calls, and outcomes with a stable run ID.

- **Operational readiness for site generation**
  - **As Brian, I want** the site-generation pipeline wired to testing and staging **so that** AI-driven changes remain safe.
    - Acceptance:
      - [AC-005] Given a site change request, when an agent applies it, then automated checks run and failures block staging/publish.
      - [AC-006] Given the staging environment, when a deploy is triggered, then the system records deployment metadata and a rollback target.

------

## Epic 1: Site structure intake + image upload and topic tagging

- **Conversational entrypoints and guardrails**
  - **As Brian, I want** a conversational menu with preset prompts and free-form input **so that** I can start quickly or ask naturally.
    - Acceptance:
      - [AC-007] Given a new session, when I open the site builder, then I see preset prompts: "Build a new website", "Add or delete website pages / update page descriptions", and "Manage site images".
      - [AC-008] Given a free-form intent outside supported functions, when I submit it, then the system replies with a fixed out-of-scope message and suggests supported prompts.

- **Business intake and site taxonomy draft**
  - **As Brian, I want** the system to ask structured questions about my photography business **so that** it can propose a site structure and topic tags.
    - Acceptance:
      - [AC-009] Given I choose "Build a new website", when the interview runs, then it covers services, delivery method, pricing model, and subject focus.
      - [AC-010] Given my responses, when the system has enough detail, then it proposes a site structure and topic tag taxonomy.
      - [AC-011] Given the proposal, when it is presented, then I receive both a structured UI view and a JSON output with schema: `site_structure.pages[] {id, title, slug, description, parent_id, order, status, template_id, service_type}` and `topic_taxonomy.tags[] {id, label, parent_id}` (see `docs/Site Intake Schema.md`).
      - [AC-012] Given my review, when I request changes, then the system revises and re-presents the structure and taxonomy before any database commit.
      - [AC-013] Given approval, when I accept the proposal, then the site structure, business description, and topic taxonomy are saved as inputs to tagging and generation.

- **Site structure editing**
  - **As Brian, I want** to add, delete, or modify pages with defaults **so that** the structure stays current without manual schema edits.
    - Acceptance:
      - [AC-014] Given an existing site structure, when I choose "Add or delete pages", then the system shows the current page tree and asks what to change.
      - [AC-015] Given a new page, when it is created, then the system provides a default page description that I can edit.
      - [AC-016] Given edits, when the system proposes updates, then it requires approval before persisting changes.

- **Image upload and topic tagging (MVP scale)**
  - **As Brian, I want** to upload images and manage topic tags **so that** the library is ready for generation.
    - Acceptance:
      - [AC-017] Given image uploads, when they complete, then images are stored, indexed, and ready for tagging.
      - [AC-018] Given an image, when auto-tagging runs, then the system assigns topic tags from the approved taxonomy with confidence scores for review.
      - [AC-019] Given manual topic tags, when I apply them, then they persist and are searchable.
      - [AC-020] Given a new tag not in the taxonomy, when the system can infer hierarchy (example: `animal.bird`), then it auto-creates the nested tag and offers an approval/revert option; otherwise it proposes the new tag for approval.
      - [AC-021] Given the MVP scope, when I manage images in this workflow, then the UI remains optimized for about 100 images or fewer at a time.

- **Site design chat + approval gating**
  - **As Brian, I want** a chat-based design assistant **so that** I can draft and polish page descriptions with approval gates.
    - Acceptance:
      - [AC-022] Given the design chat, when I draft page descriptions, then the system proposes polished copy, structure updates, and a site review with clarifying questions as needed.
      - [AC-023] Given proposed updates, when I review them, then an explicit approval action is required before committing changes.
      - [AC-024] Given the design and tagging workflows, when I switch between them, then my context and drafts are preserved.

- **Example:** "Describe my photography business, approve the proposed site structure and topic tags, upload 50 images, review tags, and draft page descriptions."

------

## Epic 2: Automated site generation and photo governance

- **Template-based generation + staging preview**
  - **As Brian, I want** to generate a full site from a template **so that** I can review a complete draft quickly.
    - Acceptance:
      - [AC-025] Given an approved site structure and topic taxonomy, when I select a template, then the system generates a full draft with AI copy and tagged images.
      - [AC-026] Given a generated draft, when I deploy to staging, then I receive a staging URL and deployment record.

- **Per-page feedback chat + iteration**
  - **As Brian, I want** to give per-page feedback via chat **so that** the system can refine pages without manual edits.
    - Acceptance:
      - [AC-027] Given a page, when I submit feedback, then the system asks clarifying questions if needed and generates an updated page version.
      - [AC-028] Given multiple iterations, when I view history, then I can compare versions and restore a prior one.

- **Image assignment + layout automation**
  - **As Brian, I want** to manually assign images to pages or let the system fill gaps **so that** placement is easy but still guided.
    - Acceptance:
      - [AC-029] Given a page, when I select "Add image to this page", then the image is assigned to that page and overrides auto-placement.
      - [AC-030] Given no manual assignments for a page, when the system places images, then it uses star ratings with fallback (5-star, then 4-star, then 3-star) and features the highest-rated images.
      - [AC-031] Given a page layout, image count, and my layout preferences, when the system renders the page, then it chooses featured layouts for 1-2 images and gallery layouts for larger sets.

- **Role rules and governance**
  - **As Brian, I want** role constraints for hero, logo, showcase, and gallery assets **so that** published pages remain valid.
    - Acceptance:
      - [AC-032] Given an existing hero_main, when I set another image as hero_main, then the prior hero_main is demoted to showcase.
      - [AC-033] Given a published hero/logo/showcase asset, when I try to delete it, then the system blocks deletion and requires replacement.
      - [AC-034] Given gallery images, when I delete or retag them, then the system updates placement on next publish unless the image is explicitly published.

- **Freshness automation**
  - **As Brian, I want** automated freshness recommendations **so that** the site stays active without constant manual browsing.
    - Acceptance:
      - [AC-035] Given a refresh interval, when it triggers, then the system proposes image swaps based on tags, roles, rating, and recent usage.

- **SEO and performance basics**
  - **As Brian, I want** SEO and optimization helpers **so that** the site performs well.
    - Acceptance:
      - [AC-036] Given a page, when I request SEO suggestions, then the system provides title/description options and editable alt-text for images.
      - [AC-037] Given uploaded images, when derivatives are generated, then web-optimized sizes and lazy-loading defaults are used in renders.

- **Example:** "Select Template A, generate a site from tagged assets, review on staging, add a hero image to the About page, and approve a gallery refresh."

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
