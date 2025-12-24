# AI Tagging (OpenAI)

This app uses OpenAI for image auto-tagging. The goal is stable, repeatable behavior.

## Versioning
- OpenAI SDK: `openai==2.1.0` (pinned in `apps/api/requirements.txt`)
- Model: `BHP_OPENAI_TAGGING_MODEL` (default `gpt-5-mini`)
- Prompt version: `BHP_OPENAI_TAGGING_PROMPT_VERSION` (default `2025-02-05`)
- Schema version: `BHP_OPENAI_TAGGING_SCHEMA_VERSION` (default `v1`)
- Image derivative width: `BHP_OPENAI_TAGGING_IMAGE_MAX_WIDTH` (default `512`)
- CA bundle (optional): `BHP_OPENAI_CA_BUNDLE` (path to custom CA certs)

If the OpenAI API or model names change, update:
1) `apps/api/requirements.txt`
2) `apps/api/app/core/settings.py` defaults
3) this file

If your network uses a custom SSL proxy, set `BHP_OPENAI_CA_BUNDLE` to the CA file path
so the OpenAI client can validate TLS.

## API compatibility checklist
- Confirm the model supports the parameters you pass (for example, some models reject `temperature`).
- Prefer response schemas that are valid for the chosen API surface (Responses vs. Chat Completions).
- Pin the SDK version and record the model name, prompt version, and schema version in this doc.
- When changing models, run a single-image smoke test before batch jobs.

## API flow
- Request: `POST /api/v1/assets/{asset_id}/auto-tag`
- Behavior: queues a background job to:
  - create a small JPEG derivative in memory
  - call OpenAI with a strict JSON schema response
  - store approved tags on the asset (`source="auto"`)
  - store unknown tags as taxonomy candidates (`status="pending"`)

## Tag taxonomy
- Base tags are seeded as approved: family, portrait, party, graduation, commercial, wildlife, travel
- Pending tags appear in the admin UI under "Tag approvals"
- Approvals: `PUT /api/v1/assets/taxonomy/{tag}` with `{"status":"approved"}`
