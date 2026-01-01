# AI Tagging and Taxonomy

## Architecture-Aligned Specification

------

## 1. Purpose

This document defines how **AI-assisted image tagging** and **taxonomy inference** operate within the BHP Management Console.

Its goals are to:

- Enrich assets with **semantic metadata**
- Support **agent reasoning and proposal generation**
- Enable **consistent, explainable site assembly**
- Remain fully compatible with:
  - Canonical-first architecture
  - Deterministic regeneration rules
  - Centralized policy and invariants

This document defines **patterns and rules**, not a fixed vocabulary.

------

## 2. Determinism Boundary (Critical)

### 2.1 What AI tagging is

AI auto-tagging is a **non-deterministic enrichment step** applied to assets.

It exists to:

- Improve search and reasoning
- Propose candidate taxonomy elements
- Assist agents during site and page generation

### 2.2 What AI tagging is NOT

AI tagging is **not** part of deterministic regeneration.

Deterministic replay does **not** depend on:

- Reproducing identical tag inference outputs
- Re-running auto-tagging jobs

### 2.3 Deterministic regeneration relies only on

- Approved canonical tags
- Explicit asset selections and/or tag-based selection rules stored in:
  - `PageConfigVersion`
  - `SiteStructureVersion`
- When selection rules are used, a `TaxonomySnapshot` is captured and referenced

**Implication:**
Auto-tagging may change over time without invalidating deterministic regeneration guarantees.

------

## 3. Versioning and Stability Controls (Tagging Layer)

To ensure **operational stability and debuggability**, the tagging pipeline is explicitly versioned.

### 3.1 Versioned components

- OpenAI SDK version (pinned)
- Model name (configurable)
- Prompt version
- JSON schema version
- Image derivative size

All of the above must be recorded per tagging run.

### 3.2 Run discipline

- When changing any versioned input:
  - Run a single-asset smoke test
  - Validate schema compatibility
- Tagging outputs are always traceable to:
  - Model
  - Prompt
  - Schema version

------

## 4. Auto-Tagging API Flow

### 4.1 Endpoint

```
POST /api/v1/assets/{asset_id}/auto-tag
```

### 4.2 Background job behavior

0. Verify the asset/library is opted in to auto-tagging
1. Create a small in-memory image derivative
2. Invoke the tagging model with a **strict JSON schema**
3. Separate outputs into:
   - Approved tag matches
   - Unknown tag candidates
4. Persist results with provenance metadata

### 4.3 Storage rules

- Approved tags:
  - Stored on the asset
  - `source = "auto"`
- Unknown tags:
  - Stored as **taxonomy candidates**
  - `status = "pending"`
  - Never promoted automatically
  - Require explicit review and approval to enter the global taxonomy

------

## 5. Taxonomy Philosophy

### 5.1 Taxonomy is a pattern, not a canon

- This document defines a **structural framework**
- Example tags are illustrative only
- The AI must generate a **business-specific taxonomy** derived from:
  - Business profile
  - Services
  - Target audience
  - Intended site structure

### 5.2 Global, not page-scoped

- Taxonomy is **global per business**
- Pages do **not** own tags
- Pages reference assets via:
  - Page configuration
  - Explicit asset slots
  - Selection rules
- Selection rules must reference a `TaxonomySnapshot` for deterministic replay

No page-scoped taxonomy exists.

------

## 6. Core Taxonomy Dimensions (Conceptual)

These dimensions exist conceptually in all taxonomies, but **names, depth, and presence vary by business**.

------

## 6.1 Role (Suitability Heuristics)

### Intent

Expresses **how suitable an image is** for different visual prominence levels.

### Example roles (illustrative)

- `Role.Hero`
- `Role.Feature`
- `Role.Support`

### Architectural clarification

- Role tags are **heuristics only**
- They:
  - Inform agent reasoning
  - Suggest candidate assets
- They **do not**:
  - Control placement
  - Override deterministic asset slots

Final placement is governed exclusively by `PageConfigVersion`.

------

## 6.2 Service (Revenue Alignment)

### Intent

Connects images to **how the business makes money**.

### Example pattern

```
Service.<PrimaryOffering>[.<Qualifier>]
```

### Illustrative examples

- `Service.Family`
- `Service.Portrait.Professional`
- `Service.SmallBusiness.Branding`
- `Service.WildlifePrints`
- `Service.Events`

### Guidance

- Derived directly from the business profile
- Avoid creating service tags for purely hobby work unless requested

------

## 6.3 Site (Structural Assets and Hints)

### Intent

Distinguishes **site mechanics** from content imagery.

#### 6.3.1 Logos and icons (canonical)

- `Site.Logo.Primary`
- `Site.Logo.Icon`
- `Site.Icon.Navigation`
- `Site.Icon.Social`

These may be referenced by **explicit asset slots**.

------

### 6.3.2 Page identifiers (inference-only)

Examples:

- `Site.Page.Home`
- `Site.Page.About`
- `Site.Page.Services.<ServiceName>`

### Important rule

`Site.Page.*` identifiers are **inference-time hints only**.

They:

- May guide initial site structure proposals
- Are **not persisted as canonical taxonomy tags**
- Are replaced by:
  - `SiteStructureVersion`
  - `PageConfigVersion`

------

## 6.4 Site.Gallery (Portfolio Organization)

### Intent

Supports gallery grouping and navigation.

### Example pattern

```
Site.Gallery.<ThemeOrService>
```

### Illustrative examples

- `Site.Gallery.Family`
- `Site.Gallery.Portrait`
- `Site.Gallery.Wildlife`
- `Site.Gallery.Travel`

### Guidance

- Galleries may align with:
  - Services
  - Topics
  - Or both
- Small sites may have very few galleries

------

## 6.5 Social (Outbound Usage)

### Intent

Controls reuse across marketing channels.

### Examples

- `Social.Blog`
- `Social.Post`
- `Social.Email`

### Guidance

- Only generate if social usage is part of the business strategy
- Social tags never affect deterministic site assembly

------

## 6.6 Topic (Semantic Meaning)

### Intent

Describes **what the image is about**, independent of business intent.

### Example topic families

- People & Life
- Style & Mood
- Environment
- Time & Light
- Subject-specific domains (e.g., wildlife, products)

### Guidance

- Topics reflect **visual reality**
- Topics supplement services; they do not replace them

------

## 7. Taxonomy Governance and Policy

### 7.1 Candidate promotion

All taxonomy candidates:

- Must pass **policy evaluation**
- Must check for:
  - Existing canonical tags
  - Aliases
- Require:
  - Explicit approval, or
  - Safe auto-commit (if policy allows)

### 7.2 Renames and aliases

- Tag renames are **never destructive**
- Stable tag IDs are preserved
- Old names become **aliases**
- Auto-tagging must resolve:
  - Canonical names
  - Aliases

This ensures historical traceability.

------

## 8. Recommended AI Output Structure

When proposing a taxonomy, the AI should return:

- A proposed tag list
- Explanation per taxonomy dimension
- Assumptions made from incomplete inputs
- Optional confidence indicators

The output is **advisory**, not authoritative.

------

## 9. Why This Scales

This approach:

- Separates **use**, **business intent**, and **semantic meaning**
- Supports service-led, portfolio-led, and hybrid photographers
- Avoids hard-coded genres
- Preserves deterministic guarantees
- Enables long-term architectural evolution

------

## 10. Architectural Closure Statement

AI tagging enriches understanding; it does not define truth.

Canonical state, policy enforcement, and deterministic page configuration remain the sole authorities for site generation and regeneration.
