# BHP Management Console Application

## Vision

### Document status

- Version: v0.6
- Scope: Local-first web application running on a laptop initially, designed to evolve to cloud-hosted components later.
- Key change from v0.5: added conversational site builder and agentic execution/testing requirements.

Below is a vision-level user story set (organized as epics -> user stories) written as build specs with acceptance criteria so an AI or developer can derive tests.

## Personas

- **Brian (Owner/Photographer)** manages everything end-to-end and wants automation + simple controls.
- **Prospective Client** wants easy inquiry, clear options, and confidence they will get a fast response.
- **Returning Client** wants quick rebooking and familiarity (preferences remembered).

------

## Epic 1: Website builder and publisher

Note: Auto-tagging is expected to be straightforward; agentic site updates from user text are the primary AI challenge and require strong testing and guardrails.

- **Site creation and structure**
  - **As Brian, I want** to select a template and have the AI generate a complete website (Home, About, Services, Portfolio, Testimonials, Blog, Contact) **so that** I can launch quickly without editing individual pages.
    - Acceptance:
      - [AC-001] Given a new project, when I select a template, then the system generates the full page set with AI copy and tagged images.
      - [AC-002] Given the generated structure, when I review pages, then updates are requested through AI instructions rather than direct page edits.
  - **As Brian, I want** the AI to choose and modify page templates (hero, galleries, CTA blocks, FAQs) based on my instructions **so that** I can iterate without manual layout work.
    - Acceptance:
      - [AC-003] Given a draft site, when I request a layout change, then the AI selects an appropriate template and updates the page parameters.
      - [AC-004] Given an instruction that does not map cleanly to a template, when the AI detects ambiguity, then it asks clarifying questions before regenerating.

- **AI website generation and iteration**
  - **As Brian, I want** the system to build a full draft using tagged images and AI copy **so that** I can get a complete first version quickly.
    - Acceptance:
      - [AC-005] Given tagged assets with roles and ratings, when I start generation, then the draft uses hero_main, showcase, gallery, and logo assets in appropriate slots.
      - [AC-006] Given the draft, when I view the site, then all pages are populated with AI copy and image placements.
  - **As Brian, I want** to provide feedback instructions through a conversational interface **so that** I can iterate without manual page edits.
    - Acceptance:
      - [AC-007] Given a draft site, when I submit feedback, then a new site version is generated with the requested changes.
      - [AC-008] Given multiple iterations, when I view history, then I can compare versions and restore a prior one.
      - [AC-009] Given instructions that are too vague, when the AI cannot safely apply them, then it asks follow-up questions.
  - **As Brian, I want** internal agents to execute and test each change **so that** the site stays stable as the AI iterates.
    - Acceptance:
      - [AC-010] Given an instruction, when an agent runs, then it returns a change summary, updated preview, and test results.
      - [AC-011] Given a failed check, when tests fail, then the system preserves the prior stable version and reports the failure.

- **Publishing workflow**
  - **As Brian, I want** a staging preview environment **so that** I can review changes before publishing.
    - Acceptance:
      - [AC-012] Given a site version, when I deploy to staging, then I get a staging URL and a record of that deployment.
  - **As Brian, I want** a guided publish from local to staging and eventually to my business domain **so that** I can promote when ready.
    - Acceptance:
      - [AC-013] Given an approved site version, when I publish to staging, then the staging site updates.
      - [AC-014] Given a staging site I approve, when I promote to the business domain, then the live domain is updated (or a manual step checklist is produced).

- **SEO and performance basics**
  - **As Brian, I want** the system to suggest SEO titles/descriptions and alt-text **so that** I improve search visibility.
    - Acceptance:
      - [AC-015] Given a page, when I request SEO suggestions, then the system provides title/description options.
      - [AC-016] Given a set of images, when I enable alt-text generation, then each image receives an editable alt-text suggestion.
  - **As Brian, I want** automatic image optimization for web (size, format, lazy load) **so that** pages load fast.
    - Acceptance:
      - [AC-017] Given uploaded images, when derivatives are generated, then web-optimized formats are created for common sizes.
      - [AC-018] Given a page render, when images load, then the UI uses derivatives and lazy loading by default.

- **Example:** "Select Template A, generate a full site from tagged assets, review, iterate with AI feedback, then push to staging."

------

## Epic 2: Website photo management and freshness

- **Library-to-website pipeline**
  - **As Brian, I want** to upload/import photos into a curated library with tags (service type, location, season, style) **so that** I can reuse them across the site and marketing.
    - Acceptance:
      - [AC-019] Given one or more images, when I upload them, then they are stored and indexed.
      - [AC-020] Given an image, when I search by tag, then the image appears in results.
  - **As Brian, I want** the system to auto-tag images by subject (portrait, family, travel, wildlife, landscape, etc.) **so that** placement can be automated.
    - Acceptance:
      - [AC-021] Given an uploaded image, when the tagging pipeline runs, then AI tags are created with confidence scores.
      - [AC-022] Given AI tags, when I review them, then I can accept, edit, or remove tags.
  - **As Brian, I want** to add manual tags and role tags (hero_main, showcase, gallery, logo, social) **so that** I can guide or override selection.
    - Acceptance:
      - [AC-023] Given an image, when I apply manual tags, then they persist and are searchable.
      - [AC-024] Given an image, when I toggle role tags, then the UI and API reflect the new roles.
  - **As Brian, I want** to star or rate photos **so that** the system prefers my best work.
    - Acceptance:
      - [AC-025] Given an image, when I rate or star it, then the score is saved and used in sorting.
  - **As Brian, I want** derived images generated in common crops (4x6, 5x7, 1x1) and optimized formats **so that** the site stays fast.
    - Acceptance:
      - [AC-026] Given a source image, when derivatives are generated, then the expected ratios and sizes exist.
      - [AC-027] Given a focal point, when derivatives are re-generated, then crops are centered on the focal point.
  - **As Brian, I want** to select featured sets per service page **so that** the portfolio stays consistent and intentional.
    - Acceptance:
      - [AC-028] Given a service page, when I assign featured images, then the page uses those assignments.

- **Role rules and governance**
  - **As Brian, I want** exactly one hero main image that must be replaced (not deleted) **so that** the site always has a primary hero.
    - Acceptance:
      - [AC-029] Given an existing hero_main, when I set another image as hero_main, then the prior hero_main is demoted to showcase.
      - [AC-030] Given hero_main, when I attempt to delete it, then the system blocks deletion and requires replacement.
  - **As Brian, I want** published logo and showcase images to be replace-only **so that** live pages never lose required assets.
    - Acceptance:
      - [AC-031] Given a published logo or showcase image, when I try to delete it, then the system blocks deletion.
      - [AC-032] Given a published logo or showcase image, when I replace it, then the new image is published and the old one becomes un-published.
  - **As Brian, I want** gallery images to be add/delete/retag friendly **so that** I can keep galleries fresh easily.
    - Acceptance:
      - [AC-033] Given a gallery image, when I delete it, then it is removed unless it is explicitly published.
      - [AC-034] Given a gallery image, when I retag it, then its placement updates on next publish.

- **Freshness automation**
  - **As Brian, I want** reminders and recommendations to refresh galleries on a schedule **so that** my site looks active.
    - Acceptance:
      - [AC-035] Given a refresh interval, when the schedule triggers, then I receive a set of suggested swaps.
  - **As Brian, I want** the system to pick images based on tags, roles, star rating, and recent usage **so that** content stays fresh without repeats.
    - Acceptance:
      - [AC-036] Given a gallery slot, when the system recommends images, then recently used assets are de-prioritized.
  - **As Brian, I want** the system to propose swaps (rotate top images) **so that** I can keep the homepage fresh without manual browsing.
    - Acceptance:
      - [AC-037] Given a homepage hero rotation rule, when I approve, then the site updates with the proposed swap set.

- **Example:** "Auto-tag as Family + Portrait, mark as hero_main, generate derivatives, and publish to staging."

------

## Epic 3: Social marketing automation

- **Post creation**
  - **As Brian, I want** AI-generated post drafts per channel (Facebook, Instagram, others later) **so that** each post fits the platform.
    - Acceptance:
      - [AC-038] Given a channel, when I request a draft, then the system generates channel-appropriate copy.
  - **As Brian, I want** the system to suggest image selections from my library **so that** posts are visually strong.
    - Acceptance:
      - [AC-039] Given a draft, when I request image suggestions, then the system selects assets based on tags and rating.

- **Scheduling and publishing**
  - **As Brian, I want** a content calendar with scheduled posts **so that** I can market consistently.
    - Acceptance:
      - [AC-040] Given a schedule, when I save it, then future posts appear on the calendar.
  - **As Brian, I want** posts published via API when available or browser automation when needed **so that** publishing is still automated.
    - Acceptance:
      - [AC-041] Given a scheduled post, when it reaches its time, then the system queues it for publish or manual approval.

- **Review and approval**
  - **As Brian, I want** an approval step before anything posts **so that** I stay in control of brand voice and offers.
    - Acceptance:
      - [AC-042] Given a draft, when I approve, then it moves to scheduled/publish state.

------

## Epic 4: Paid ads and budget management

- **Budget and seasonality planning**
  - **As Brian, I want** to set a monthly/seasonal budget and target area (ZIP/city radius) **so that** ad spend stays constrained and local.
    - Acceptance:
      - [AC-043] Given a budget, when I save it, then it is enforced in campaign creation.
  - **As Brian, I want** an annual "photo-worthy events" calendar template **so that** campaigns align to real booking cycles.
    - Acceptance:
      - [AC-044] Given the calendar, when I select a season, then the system suggests campaigns.

- **Campaign recommendations**
  - **As Brian, I want** the system to recommend campaign types, audiences, and spend splits (Facebook first, Google second) **so that** I get guided decisions.
    - Acceptance:
      - [AC-045] Given a budget and objective, when I request recommendations, then I receive suggested campaigns.
  - **As Brian, I want** the system to propose A/B variations (headline/image/CTA) **so that** performance improves over time.
    - Acceptance:
      - [AC-046] Given a campaign, when I request variations, then at least two variants are generated.

- **Campaign execution and monitoring**
  - **As Brian, I want** campaigns created/launched via API (or guided steps) **so that** setup is not a barrier.
    - Acceptance:
      - [AC-047] Given approval, when I launch a campaign, then the system creates it with the configured budget.
  - **As Brian, I want** simple performance summaries (spend, clicks, leads) **so that** I know what is working.
    - Acceptance:
      - [AC-048] Given running campaigns, when I open reports, then I see spend and lead metrics.

------

## Epic 5: "Free ads" via community group posting

- **Group directory and rules**
  - **As Brian, I want** to maintain a list of Facebook groups and posting rules (days allowed, format, promo limits) **so that** automation stays compliant.
    - Acceptance:
      - [AC-049] Given a group profile, when I save rules, then posting respects those constraints.

- **Automated posting**
  - **As Brian, I want** the system to generate and post group-friendly offers **so that** I can market without paid spend.
    - Acceptance:
      - [AC-050] Given a group, when I request a post, then the system drafts copy that matches the group rules.
  - **As Brian, I want** browser-based posting automation where APIs are not available **so that** it still works end-to-end.
    - Acceptance:
      - [AC-051] Given an approved draft, when automation runs, then the post is submitted in assistive mode.

------

## Epic 6: Blog writing and promotion

- **Blog drafting**
  - **As Brian, I want** AI-assisted blog post outlines and drafts in my brand voice **so that** I can publish consistently.
    - Acceptance:
      - [AC-052] Given a topic, when I request a draft, then the system returns an outline and first draft.
  - **As Brian, I want** to embed curated photo sets into blog templates **so that** posts look polished.
    - Acceptance:
      - [AC-053] Given a draft, when I attach a photo set, then the blog preview shows the embedded gallery.

- **Promotion automation**
  - **As Brian, I want** the system to generate a social promotion pack (FB post, IG caption, short teaser) **so that** each blog gets distributed.
    - Acceptance:
      - [AC-054] Given a blog post, when I request promotion assets, then channel-specific snippets are generated.

------

## Epic 7: Internal activity journal (notes + best photos)

- **Capture and organization**
  - **As Brian, I want** an internal journal to log shoots, scouting trips, and ideas **so that** I build a reusable knowledge base.
    - Acceptance:
      - [AC-055] Given a journal entry, when I save it, then it appears in the journal list with photos attached.
  - **As Brian, I want** to attach my "best selects" to each entry **so that** the system can reuse them for site/social/blog.
    - Acceptance:
      - [AC-056] Given a journal entry, when I attach selects, then those assets are linked to the entry.

- **Recommendations**
  - **As Brian, I want** weekly recommendations for website updates and marketing content from recent journal entries **so that** content creation feels automatic.
    - Acceptance:
      - [AC-057] Given recent entries, when the weekly job runs, then recommendations are created for review.

------

## Epic 8: Contact management (CRM) + inquiry handling

- **Contact database**
  - **As Brian, I want** a contact database for clients and leads **so that** I can track relationships over time.
    - Acceptance:
      - [AC-058] Given a new contact, when I save it, then it is searchable and linked to inquiries.
  - **As Brian, I want** each contact to have history (sessions, preferences, notes, payments) **so that** repeat business is easy.
    - Acceptance:
      - [AC-059] Given a contact, when I open the record, then I see past sessions and notes.

- **Inbound inquiry capture**
  - **As Brian, I want** a spam-resistant contact form on my website **so that** real inquiries reach me without bot noise.
    - Acceptance:
      - [AC-060] Given a submission, when the form passes spam checks, then it creates an inquiry.
  - **As Brian, I want** email monitoring for my business inbox **so that** inquiries do not slip through.
    - Acceptance:
      - [AC-061] Given a new email, when it matches inquiry rules, then an inquiry is created.
  - **As Brian, I want** alerts for new inbound contacts **so that** I respond quickly.
    - Acceptance:
      - [AC-062] Given a new inquiry, when it arrives, then I receive a notification.

- **Drafting and sending responses**
  - **As Brian, I want** response drafting assistance based on the inquiry type **so that** I can reply fast and professionally.
    - Acceptance:
      - [AC-063] Given an inquiry, when I request a draft, then the system produces a reply for approval.
  - **As Brian, I want** an approval step before sending **so that** I control tone and offers.
    - Acceptance:
      - [AC-064] Given a draft, when I approve, then it is sent via the configured channel.

- **Proposal and session planning**
  - **As Brian, I want** a proposal email generator that includes time, location, and instructions **so that** booking is consistent and clear.
    - Acceptance:
      - [AC-065] Given booking details, when I generate a proposal, then the draft includes all required fields.

- **Client intake form**
  - **As Brian, I want** an intake form that collects preferences (style, family details, goals, constraints) **so that** sessions are tailored.
    - Acceptance:
      - [AC-066] Given an intake form, when a client submits it, then their preferences are stored on their contact record.

------

## Epic 9: Simple financial tracking and reporting

- **Shoot registry + income/expenses**
  - **As Brian, I want** each photo shoot to be a record with date, client, package, income, and related costs **so that** I can track profitability.
    - Acceptance:
      - [AC-067] Given a shoot record, when I save it, then income and expenses are included in reports.
  - **As Brian, I want** an expense tracker aligned to standard tax categories **so that** bookkeeping is painless.
    - Acceptance:
      - [AC-068] Given an expense, when I assign a category, then it appears in exports.

- **Reporting**
  - **As Brian, I want** an annual income/expense report export **so that** I can hand it to my accountant.
    - Acceptance:
      - [AC-069] Given a fiscal year, when I export, then the report includes totals by category.
  - **As Brian, I want** monthly snapshots (revenue, spend, net) **so that** I see trends quickly.
    - Acceptance:
      - [AC-070] Given a month, when I view snapshots, then I see revenue and expense totals.

------

## Cross-cutting Epic: Integrations, security, and safety controls

- **Integrations**
  - **As Brian, I want** to connect accounts (Facebook, Instagram, Google Ads, email, hosting) **so that** automation can operate end-to-end.
    - Acceptance:
      - [AC-071] Given valid credentials, when I connect an account, then the system validates and stores the connection.
  - **As Brian, I want** integration health checks (token expired, permissions missing) **so that** automation does not silently fail.
    - Acceptance:
      - [AC-072] Given a broken integration, when a health check runs, then I see an alert with next steps.

- **Control and safety**
  - **As Brian, I want** a global "approval required" setting for posting/sending/publishing **so that** nothing happens unexpectedly.
    - Acceptance:
      - [AC-073] Given approvals enabled, when an agent proposes a risky action, then it requires explicit approval.
  - **As Brian, I want** audit logs for actions taken (what posted, where, when) **so that** I can track activity.
    - Acceptance:
      - [AC-074] Given a tool action, when it completes, then an audit log entry is created.

- **Data management**
  - **As Brian, I want** backups/export of my contacts, posts, finances, and journal **so that** I am not locked in.
    - Acceptance:
      - [AC-075] Given an export request, when it completes, then I can download a structured export.
  - **As Brian, I want** local-first operation on my laptop **so that** I can start without cloud complexity.
    - Acceptance:
      - [AC-076] Given local mode, when I start the system, then it runs without cloud dependencies.

------

## A simple MVP cut (if you want a "start here" slice)

- AI image classification pipeline + manual review workflow
- Role-driven website generation from tagged images
- Conversational AI site builder with feedback loop and agent-run testing
- Staging deploy and preview workflow
- Photo library tagging + derivative generation
- Website builder + publish baseline
- Social drafts (manual publish first)
- CRM basics + contact form intake + response drafts
- Shoot registry + expense categories + annual export

## Appendix: Now / Next / Later

- **Now**
  - AI image classification pipeline (upload -> auto-tag -> review)
  - Role governance (hero_main uniqueness, published logo/showcase replacement rules)
  - AI website generation from tagged assets with conversational feedback
  - Agent execution + automated checks for each site update
  - Staging deploy + review workflow
- **Next**
  - SEO helpers, alt-text generation, and richer template customization
  - Site placement editor for hero/showcase/gallery slots
  - Automation for scheduled gallery freshness updates
- **Later**
  - Social marketing automation, blog drafting + promotion
  - CRM, inquiry automation, and finance reporting
  - Paid ads automation and community group posting