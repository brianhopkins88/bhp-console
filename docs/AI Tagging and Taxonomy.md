# AI Tagging and Taxonomy
**Normative Reference:** Vision/Architecture v0.13.

## Architecture-Aligned Specification (v0.13)

------

## 1. Purpose

This document defines how **AI-assisted image tagging** and **taxonomy inference** operate within the BHP Management Console.

Its goals are to:

- Enrich assets with **semantic metadata**
- Support **agent reasoning and proposal generation**
- Enable **consistent, explainable site assembly**
- Maintain a **single user-visible taxonomy** with **reserved tag invariants**
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

## 5. Taxonomy Principles (v0.13)

### 5.1 Single user-visible taxonomy

- There is one global tag list per business.
- Tags are not namespaced (avoid `Role.*`, `Service.*`, `Site.*`).
- Tags can represent services, subjects, style, location, or usage context, but they live in the same list.
- Reserved tags must exist: `hero`, `logo`, `photographer`, `owner`.

### 5.2 Global, not page-scoped

- Taxonomy is **global per business**.
- Pages do **not** own tags.
- Pages reference assets via:
  - Page configuration
  - Explicit asset slots
  - Selection rules
- Selection rules must reference a `TaxonomySnapshot` for deterministic replay.

### 5.3 Reserved tags and invariants

- Reserved tags cannot be deleted.
- At least one asset must be tagged with each reserved tag before staging builds.
- Reserved tags are enforced by policy, not by agents.

------

## 6. Tagging guidance (single taxonomy)

### 6.1 What to tag

- Revenue services (what the business sells)
- Subjects and genres (what is depicted)
- Style and mood (how it looks)
- Location or setting (when relevant)
- Usage intent (blog, social) only when explicitly part of the business plan

### 6.2 Tag format

- Tag IDs should be short, lowercase slugs (labels can be human-friendly).
- Prefer nouns or short phrases; avoid long sentences.
- Do not use dotted namespaces or category prefixes.

### 6.3 Illustrative examples

- Reserved: `hero`, `logo`, `photographer`, `owner`
- Services: `family`, `senior-portraits`, `commercial-branding`, `product`
- Subjects: `newborns`, `weddings`, `wildlife`, `travel`
- Style/mood: `candid`, `dramatic`, `black-and-white`, `golden-hour`
- Setting: `outdoor`, `studio`, `urban`

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

### 7.3 Reserved tag enforcement

- Policy blocks staging or publish when reserved tags are missing on assets.
- Agents may propose reserved tags, but cannot bypass enforcement.

------

## 8. Recommended AI Output Structure

When proposing tags or a taxonomy, the AI should return:

- A proposed tag list
- Which tags are reserved vs descriptive
- Assumptions made from incomplete inputs
- Missing reserved tags or gaps to resolve
- Optional confidence indicators

The output is **advisory**, not authoritative.

------

## 9. Why This Scales

This approach:

- Keeps the user experience simple (one taxonomy)
- Supports service-led, portfolio-led, and hybrid businesses
- Avoids rigid genre hierarchies
- Preserves deterministic guarantees
- Enables long-term architectural evolution

------

## 10. Architectural Closure Statement

AI tagging enriches understanding; it does not define truth.

Canonical state, policy enforcement, and deterministic page configuration remain the sole authorities for site generation and regeneration.
