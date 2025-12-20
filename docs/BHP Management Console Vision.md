# BHP Management Console Application

## Vision

### Document status

- Version: v0.2
- Scope: Local-first web application running on a laptop initially, designed to evolve to cloud-hosted components later.
- Key change from v0.1: “Agentified” automation using OpenAI-first agentic patterns, with strong guardrails and approvals.

Below is a “vision-level” user story set (organized as epics → user stories) that matches everything you described. It’s intentionally written like a product backlog you can hand to a developer—or use to guide an AI agent build plan.

## Personas

- **Brian (Owner/Photographer)** manages everything end-to-end and wants automation + simple controls.
- **Prospective Client** wants easy inquiry, clear options, and confidence they’ll get a fast response.
- **Returning Client** wants quick rebooking and familiarity (preferences remembered).

------

## Epic 1: Website builder and publisher

- **Site creation and structure**
  - **As Brian, I want** to generate a professional website structure (Home, About, Services, Portfolio, Testimonials, Blog, Contact) **so that** I can launch quickly without starting from scratch.
  - **As Brian, I want** editable page templates (hero, galleries, CTA blocks, FAQs) **so that** I can update content without redesigning.
  - **Example:** “Create a new service page for ‘Graduation Photography’ with pricing blocks, FAQ, and a gallery placeholder.”
- **Publishing workflow**
  - **As Brian, I want** one-click (or guided) publish to my hosting provider **so that** updates go live reliably.
  - **As Brian, I want** a staging preview environment **so that** I can review changes before publishing.
  - **Example:** “Preview a new Home page hero swap + CTA button update, then publish.”
- **SEO and performance basics**
  - **As Brian, I want** the system to suggest SEO titles/descriptions and alt-text **so that** I improve search visibility.
  - **As Brian, I want** automatic image optimization for web (size, format, lazy load) **so that** pages load fast.
  - **Example:** “Auto-generate alt text for 20 photos from the Fall family session set.”

------

## Epic 2: Website photo management and freshness

- **Library-to-website pipeline**
  - **As Brian, I want** to upload/import photos into a curated library with tags (service type, location, season, style) **so that** I can reuse them across the site and marketing.
  - **As Brian, I want** to select “featured sets” per service page **so that** the portfolio stays consistent and intentional.
  - **Example:** “Tag 30 images as: Family / Felicita Park / Golden hour / Fall.”
- **Freshness automation**
  - **As Brian, I want** reminders and recommendations to refresh galleries on a schedule **so that** my site looks active.
  - **As Brian, I want** the system to propose swaps (rotate top images) **so that** I can keep the homepage fresh without manual browsing.
  - **Example:** “Rotate 3 homepage hero candidates monthly from my ‘Best of’ album.”

------

## Epic 3: Social marketing automation

- **Post creation**
  - **As Brian, I want** AI-generated post drafts per channel (Facebook, Instagram, others later) **so that** each post fits the platform.
  - **As Brian, I want** the system to suggest image selections from my library **so that** posts are visually strong.
  - **Example:** “Create an Instagram caption + 8 hashtags for Mother’s Day mini sessions.”
- **Scheduling and publishing**
  - **As Brian, I want** a content calendar with scheduled posts **so that** I can market consistently.
  - **As Brian, I want** posts published via API when available or browser automation when needed **so that**publishing is still automated.
  - **Example:** “Schedule weekly ‘Fall booking’ posts every Sunday at 6pm for 6 weeks.”
- **Review and approval**
  - **As Brian, I want** an approval step before anything posts **so that** I stay in control of brand voice and offers.
  - **Example:** “Show me all posts for next week; I approve/edit then publish.”

------

## Epic 4: Paid ads and budget management

- **Budget and seasonality planning**
  - **As Brian, I want** to set a monthly/seasonal budget and target area (ZIP/city radius) **so that** ad spend stays constrained and local.
  - **As Brian, I want** an annual “photo-worthy events” calendar template **so that** campaigns align to real booking cycles.
  - **Example:** “Allocate $100/month with heavier spend in Sep–Nov for fall family photos.”
- **Campaign recommendations**
  - **As Brian, I want** the system to recommend campaign types, audiences, and spend splits (Facebook first, Google second) **so that** I get guided decisions.
  - **As Brian, I want** the system to propose A/B variations (headline/image/CTA) **so that** performance improves over time.
  - **Example:** “Recommend two Facebook campaigns: ‘Fall Family Sessions’ and ‘Graduation Photos’ with $3/day each.”
- **Campaign execution and monitoring**
  - **As Brian, I want** campaigns created/launched via API (or guided steps) **so that** setup is not a barrier.
  - **As Brian, I want** simple performance summaries (spend, clicks, leads) **so that** I know what’s working.
  - **Example:** “Alert me if CPC doubles week-over-week or if a campaign hits budget early.”

------

## Epic 5: “Free ads” via community group posting

- **Group directory and rules**
  - **As Brian, I want** to maintain a list of Facebook groups and posting rules (days allowed, format, promo limits) **so that** automation stays compliant.
  - **Example:** “Neighborhood ‘Buy/Sell/Services’ group: post allowed Mondays only.”
- **Automated posting**
  - **As Brian, I want** the system to generate and post group-friendly offers **so that** I can market without paid spend.
  - **As Brian, I want** browser-based posting automation where APIs aren’t available **so that** it still works end-to-end.
  - **Example:** “Post ‘Holiday mini sessions’ to 3 groups with slightly different wording.”

------

## Epic 6: Blog writing and promotion

- **Blog drafting**
  - **As Brian, I want** AI-assisted blog post outlines and drafts in my brand voice **so that** I can publish consistently.
  - **As Brian, I want** to embed curated photo sets into blog templates **so that** posts look polished.
  - **Example:** “Draft: ‘Best Locations for Family Photos in North County San Diego’ with 10 images.”
- **Promotion automation**
  - **As Brian, I want** the system to generate a social promotion pack (FB post, IG caption, short teaser) **so that**each blog gets distributed.
  - **Example:** “Create 3 social snippets that tease the blog and link to the post.”

------

## Epic 7: Internal activity journal (notes + best photos)

- **Capture and organization**
  - **As Brian, I want** an internal journal to log shoots, scouting trips, and ideas **so that** I build a reusable knowledge base.
  - **As Brian, I want** to attach my “best selects” to each entry **so that** the system can reuse them for site/social/blog.
  - **Example:** “Journal entry: Felicita Park sunset—notes on lighting + 12 best photos.”
- **Recommendations**
  - **As Brian, I want** weekly recommendations for website updates and marketing content from recent journal entries **so that** content creation feels automatic.
  - **Example:** “Recommend: update Family gallery with 5 new images; generate 2 IG posts from last weekend.”

------

## Epic 8: Contact management (CRM) + inquiry handling

- **Contact database**
  - **As Brian, I want** a contact database for clients and leads **so that** I can track relationships over time.
  - **As Brian, I want** each contact to have history (sessions, preferences, notes, payments) **so that** repeat business is easy.
  - **Example:** “The Smith family: prefers golden hour, kids names, last session date, favorite images.”
- **Inbound inquiry capture**
  - **As Brian, I want** a spam-resistant contact form on my website **so that** real inquiries reach me without bot noise.
  - **As Brian, I want** email monitoring for my business inbox **so that** inquiries don’t slip through.
  - **As Brian, I want** alerts for new inbound contacts **so that** I respond quickly.
  - **Example:** “New inquiry detected → notify me + draft a response.”
- **Drafting and sending responses**
  - **As Brian, I want** response drafting assistance based on the inquiry type **so that** I can reply fast and professionally.
  - **As Brian, I want** an approval step before sending **so that** I control tone and offers.
  - **Example:** “Draft reply: graduation session options + pricing + next steps.”
- **Proposal and session planning**
  - **As Brian, I want** a proposal email generator that includes time, location, and instructions **so that** booking is consistent and clear.
  - **Example:** “Proposal includes: parking guidance, what to wear, session length, delivery timeline.”
- **Client intake form**
  - **As Brian, I want** an intake form that collects preferences (style, family details, goals, constraints) **so that**sessions are tailored.
  - **Example:** “Intake: family names/ages, desired vibe, must-have shots, outfit guidance needed?”

------

## Epic 9: Simple financial tracking and reporting

- **Shoot registry + income/expenses**
  - **As Brian, I want** each photo shoot to be a record with date, client, package, income, and related costs **so that**I can track profitability.
  - **As Brian, I want** an expense tracker aligned to standard tax categories **so that** bookkeeping is painless.
  - **Example:** “Session: $350 income; expenses: assistant $80; mileage estimate; props $25.”
- **Reporting**
  - **As Brian, I want** an annual income/expense report export **so that** I can hand it to my accountant.
  - **As Brian, I want** monthly snapshots (revenue, spend, net) **so that** I see trends quickly.
  - **Example:** “2025 summary by category: advertising, equipment, software subscriptions, travel.”

------

## Cross-cutting Epic: Integrations, security, and safety controls

- **Integrations**
  - **As Brian, I want** to connect accounts (Facebook, Instagram, Google Ads, email, hosting) **so that** automation can operate end-to-end.
  - **As Brian, I want** integration health checks (token expired, permissions missing) **so that** automation doesn’t silently fail.
- **Control and safety**
  - **As Brian, I want** a global “approval required” setting for posting/sending/publishing **so that** nothing happens unexpectedly.
  - **As Brian, I want** audit logs for actions taken (what posted, where, when) **so that** I can track activity.
- **Data management**
  - **As Brian, I want** backups/export of my contacts, posts, finances, and journal **so that** I’m not locked in.
  - **As Brian, I want** local-first operation on my laptop **so that** I can start without cloud complexity.

------

## A simple MVP cut (if you want a “start here” slice)

- Website builder + publish
- Photo library + tagging + homepage/service gallery refresh suggestions
- Social post drafting + scheduling (manual publish first, then automation)
- CRM basics + contact form intake + email alerting + response drafts
- Shoot registry + expense categories + annual export

If you want, in the next step I can convert this into a **prioritized story map** (Now / Next / Later) and add **acceptance criteria** (Given/When/Then) for each MVP story so it’s implementation-ready.