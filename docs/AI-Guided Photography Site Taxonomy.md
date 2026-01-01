# AI-Guided Photography Site Taxonomy

**Adaptive Reference Framework (All Tags Are Examples)**

## Front Matter — How the AI Should Use This

**Purpose**

- This document provides a **reference taxonomy pattern**, not a fixed vocabulary.
- All taxonomy items shown are **illustrative examples only**.
- The AI should use this guidance to **construct a proposed, business-specific taxonomy** from structured business profile inputs.

**AI Responsibilities**

- Infer services, subjects, and channels from the business profile.
- Generate a **customized tag set** that follows this structure.
- Omit irrelevant categories and extend where appropriate.
- Preserve **semantic consistency**, not literal tag names.

**Business Profile Inputs (examples)**

- Photographer type (e.g., family, commercial, wildlife)
- Primary revenue services
- Secondary or aspirational work
- Target clients and usage channels
- Website pages to generate
- Social and marketing strategy

------

## Core Taxonomy Dimensions (Pattern, Not Canon)

These dimensions should exist conceptually in all generated taxonomies, but **specific tag names and depth will vary**.

------

## 1. Role (How the Image Is Used)

**Intent**

- Guides layout priority and visual prominence.

**Example Roles**

- `Role.Hero`
  Main visual anchor for a page
- `Role.Feature`
  High-impact images preferred in page sections
- `Role.Support`
  Grid, carousel, or supporting imagery

**AI Guidance**

- Generate only the roles needed for the site complexity.
- Prefer fewer roles for simpler businesses.

------

## 2. Service (Revenue-Generating Offerings)

**Intent**

- Explicitly links images to **how the business makes money**.

**Example Pattern**

- `Service.<PrimaryOffering>`
- Optional depth for meaningful differentiation

**Illustrative Examples**

- `Service.Family`
- `Service.Portrait.Professional`
- `Service.SmallBusiness.Branding`
- `Service.WildlifePrints`
- `Service.Events`

**AI Guidance**

- Derive services directly from the business profile.
- Do not create service tags for purely hobby work unless requested.

------

## 3. Site (Structural & Design Assets)

**Intent**

- Separates **content images** from **site mechanics**.

### 3.1 Site.Logo (Examples)

- `Site.Logo.Primary`
- `Site.Logo.Icon`

### 3.2 Site.Icon (Examples)

- `Site.Icon.Navigation`
- `Site.Icon.Social`

### 3.3 Site.Page (Examples)

- `Site.Page.Home`
- `Site.Page.About`
- `Site.Page.Services.<ServiceName>`
- `Site.Page.Portfolio`
- `Site.Page.Contact`

**AI Guidance**

- Generate page tags only for pages that will exist.
- Page tags should override generic role preferences.

------

## 4. Site.Gallery (Portfolio Organization)

**Intent**

- Enables automated gallery generation and navigation.

**Example Pattern**

- `Site.Gallery.<ThemeOrService>`

**Illustrative Examples**

- `Site.Gallery.Family`
- `Site.Gallery.Portrait`
- `Site.Gallery.Wildlife`
- `Site.Gallery.Travel`

**AI Guidance**

- Galleries may align to services, topics, or both.
- Small sites may have only 1–2 galleries.

------

## 5. Social (Outbound & Marketing Use)

**Intent**

- Controls reuse across blogs, email, and social platforms.

**Example Categories**

- `Social.Blog`
- `Social.Post`
- `Social.Email`

**Optional Depth**

- Format or channel specific subtags if required.

**AI Guidance**

- Only generate social tags if social usage is part of the business strategy.

------

## 6. Topic (What the Image Is About)

**Intent**

- Semantic understanding for search, fallback logic, and gallery grouping.

**Example Topic Families**

- People & Life (e.g., families, individuals)
- Style & Mood (e.g., candid, dramatic)
- Environment (e.g., outdoor, studio)
- Time & Light (e.g., golden hour)
- Subject-Specific (e.g., wildlife, products)

**AI Guidance**

- Topics should reflect **visual reality**, not services.
- Use topics to supplement, not replace, Service tags.

------

# Applying the Same Scheme to Different Photography Businesses

Below are **illustrative examples** showing how the same taxonomy pattern adapts.

------

## Example 1: Family & Portrait Photographer (Local, Service-Driven)

**Business Characteristics**

- Primary revenue: family sessions, portraits
- Secondary: graduations
- Strong website + light social marketing

**Likely AI-Generated Taxonomy**

- Roles: Hero, Feature, Support
- Services: Family, Portrait, Graduation
- Pages: Home, About, Services.Family, Services.Portrait, Contact
- Galleries: Family, Portrait
- Topics: Children, Couples, Outdoor, GoldenHour

**Key Insight**

- Service tags dominate; topics refine presentation.

------

## Example 2: Small Business / Commercial Photographer

**Business Characteristics**

- Clients are companies, not individuals
- Images used for branding, websites, campaigns

**Likely AI-Generated Taxonomy**

- Roles: Hero, Feature, Support
- Services: Branding, Product, EnvironmentalPortrait
- Pages: Home, Services.Branding, Portfolio, Contact
- Galleries: Branding, Product
- Topics: Office, Product, Urban, Studio

**Key Insight**

- Fewer emotional topics, more contextual and functional ones.

------

## Example 3: Wildlife & Travel Photographer (Portfolio + Prints)

**Business Characteristics**

- Revenue from prints, workshops, licensing
- Portfolio-driven site
- Strong blog and storytelling

**Likely AI-Generated Taxonomy**

- Roles: Hero, Feature
- Services: WildlifePrints, Workshops, Licensing
- Pages: Home, Portfolio, Blog, Prints
- Galleries: Wildlife, Travel
- Topics: Animals, Birds, Landscapes, Africa, Sunset

**Key Insight**

- Topic and Gallery tags dominate; services are secondary.

------

## Example 4: Hybrid Photographer (Family + Wildlife Passion Work)

**Business Characteristics**

- Family photography pays the bills
- Wildlife used for brand differentiation

**Likely AI-Generated Taxonomy**

- Roles: Hero, Feature, Support
- Services: Family, Portrait
- Pages: Home, Services, Portfolio, About
- Galleries: Family, Wildlife
- Topics: Children, Outdoor, Wildlife, Nature

**Key Insight**

- AI should prevent wildlife from overwhelming service pages.

------

# Recommended AI Output Structure

When generating a taxonomy, the AI should return:

- A **proposed tag list** customized to the business
- A **short explanation** of each dimension
- Any **assumptions made** from incomplete inputs
- Optional confidence scores for inferred services or topics

------

## Why This Scales Across Many Small Photography Businesses

- Separates **use**, **business intent**, and **visual meaning**
- Works for service-led, portfolio-led, and hybrid models
- Avoids hard-coding photography genres
- Enables deterministic site assembly with flexible creativity

If you want, next steps could include:

- A **business-profile → taxonomy inference prompt**
- A **JSON schema** for storing the generated taxonomy
- **Validation rules** (e.g., required tags per image)
- **Design-agent heuristics** that consume this taxonomy