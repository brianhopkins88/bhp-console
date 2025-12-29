# Site Intake JSON Schema

This schema defines the structured output produced by the site intake flow.
It is used by the UI for review and by agents for downstream generation.

## JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SiteIntakeResult",
  "type": "object",
  "required": ["business_profile", "site_structure", "topic_taxonomy"],
  "additionalProperties": false,
  "properties": {
    "business_profile": {
      "type": "object",
      "required": ["services", "delivery_methods", "pricing_models", "subjects"],
      "additionalProperties": false,
      "properties": {
        "services": {
          "type": "array",
          "minItems": 1,
          "items": { "type": "string", "minLength": 1, "maxLength": 120 }
        },
        "delivery_methods": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "enum": ["download", "prints", "albums", "in_person", "other"]
          }
        },
        "pricing_models": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "enum": ["hourly", "fixed_time", "per_image", "package", "license", "other"]
          }
        },
        "pricing_notes": { "type": "string", "maxLength": 2000 },
        "subjects": {
          "type": "array",
          "minItems": 1,
          "items": { "type": "string", "minLength": 1, "maxLength": 120 }
        },
        "location": { "type": "string", "maxLength": 200 },
        "target_audience": { "type": "string", "maxLength": 200 },
        "brand_voice": { "type": "string", "maxLength": 200 },
        "notes": { "type": "string", "maxLength": 4000 }
      }
    },
    "site_structure": {
      "type": "object",
      "required": ["pages"],
      "additionalProperties": false,
      "properties": {
        "pages": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["id", "title", "slug", "description", "order", "status"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "pattern": "^[a-z0-9_-]+$", "maxLength": 64 },
              "title": { "type": "string", "minLength": 1, "maxLength": 120 },
              "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$", "maxLength": 120 },
              "description": { "type": "string", "maxLength": 2000 },
              "parent_id": { "type": ["string", "null"], "pattern": "^[a-z0-9_-]+$" },
              "order": { "type": "integer", "minimum": 0 },
              "status": { "type": "string", "enum": ["draft", "approved", "archived"] },
              "template_id": { "type": ["string", "null"], "maxLength": 80 },
              "service_type": { "type": ["string", "null"], "maxLength": 80 },
              "notes": { "type": "string", "maxLength": 2000 }
            }
          }
        }
      }
    },
    "topic_taxonomy": {
      "type": "object",
      "required": ["tags"],
      "additionalProperties": false,
      "properties": {
        "tags": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["id", "label"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "pattern": "^[a-z0-9_.-]+$", "maxLength": 120 },
              "label": { "type": "string", "minLength": 1, "maxLength": 120 },
              "parent_id": { "type": ["string", "null"], "pattern": "^[a-z0-9_.-]+$" }
            }
          }
        }
      }
    },
    "review": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "approved": { "type": "boolean" },
        "changes_requested": { "type": "string", "maxLength": 4000 }
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": { "type": "string", "maxLength": 20 },
        "generated_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

## Validation rules (beyond schema)

- `site_structure.pages[].id` must be unique.
- `site_structure.pages[].slug` must be unique.
- `site_structure.pages[].parent_id` must refer to an existing page id or be null.
- `site_structure.pages[].order` is zero-based within a parent group.
- `topic_taxonomy.tags[].id` must be unique.
- `topic_taxonomy.tags[].parent_id` must refer to an existing tag id or be null.

## Minimal example

```json
{
  "business_profile": {
    "services": ["family portraits", "senior portraits"],
    "delivery_methods": ["download", "prints"],
    "pricing_models": ["package"],
    "subjects": ["family", "portraits"],
    "location": "Bend, OR"
  },
  "site_structure": {
    "pages": [
      {
        "id": "home",
        "title": "Home",
        "slug": "home",
        "description": "Welcome and overview",
        "parent_id": null,
        "order": 0,
        "status": "approved",
        "template_id": "tpl-home-hero",
        "service_type": null
      },
      {
        "id": "services",
        "title": "Services",
        "slug": "services",
        "description": "Packages and offerings",
        "parent_id": null,
        "order": 1,
        "status": "approved",
        "template_id": "tpl-services-grid",
        "service_type": "services"
      }
    ]
  },
  "topic_taxonomy": {
    "tags": [
      { "id": "family", "label": "Family", "parent_id": null },
      { "id": "portraits", "label": "Portraits", "parent_id": null }
    ]
  },
  "metadata": {
    "schema_version": "1.0",
    "generated_at": "2025-01-01T12:00:00Z"
  }
}
```
