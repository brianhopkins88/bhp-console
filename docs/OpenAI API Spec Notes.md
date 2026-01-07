# OpenAI API Spec Notes (Pinned)
**Normative Reference:** Vision/Architecture v0.13.

This document records the OpenAI API specifics we rely on for stable, bug-minimized integrations.
It is a living checklist of API behaviors, pinning rules, and lessons learned.

## Purpose

- Keep OpenAI API usage stable by pinning SDK and model versions.
- Centralize the parameters, endpoints, and response parsing rules we depend on.
- Track lessons learned and migration steps as the API evolves.

## Pinned versions and settings

- SDK: `openai==2.1.0` (pinned in `apps/api/requirements.txt`).
- API surface: OpenAI Responses API (used in `apps/api/app/services/ai_tagging.py`).
- Model (tagging): `BHP_OPENAI_TAGGING_MODEL` (default `gpt-5-mini`).
- Prompt version: `BHP_OPENAI_TAGGING_PROMPT_VERSION` (default `2025-02-05`).
- Schema version: `BHP_OPENAI_TAGGING_SCHEMA_VERSION` (default `v1`).
- Image max width: `BHP_OPENAI_TAGGING_IMAGE_MAX_WIDTH` (default `512`).
- Model (embeddings): `BHP_OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`).
- Embedding dimensions: `BHP_OPENAI_EMBEDDING_DIMENSIONS` (default `1536`).
- CA bundle (optional): `BHP_OPENAI_CA_BUNDLE` (path to custom CA certs).

## Required environment variables

- `BHP_OPENAI_API_KEY` (required for all OpenAI calls).
- `BHP_OPENAI_CA_BUNDLE` (optional; set for SSL inspection environments).
- `BHP_OPENAI_TAGGING_MODEL`, `BHP_OPENAI_TAGGING_PROMPT_VERSION`, `BHP_OPENAI_TAGGING_SCHEMA_VERSION` (pinned in settings defaults).
- `BHP_OPENAI_EMBEDDING_MODEL`, `BHP_OPENAI_EMBEDDING_DIMENSIONS` (pinned in settings defaults).

## API usage patterns (current)

### Responses API (image tagging)

- Client: `OpenAI(api_key=..., http_client=httpx.Client(verify=...))`.
- Endpoint: `client.responses.create(...)`.
- Input payload:
  - `input` list with `input_text` and `input_image` (data URL).
  - JSON schema enforced via `text.format` with `json_schema`.
- Response parsing:
  - Prefer `response.output_text` if present.
  - Fallback to `response.output[].content[].text` for `output_text` chunks.
  - Parse JSON with `json.loads` and validate the expected keys.

### Balance endpoint (admin UI)

- Endpoint: `GET https://api.openai.com/v1/dashboard/billing/credit_grants`.
- Client: `httpx.Client(verify=..., timeout=10.0)`.
- Error handling: surface HTTP status + short response snippet.
- Policy: best-effort UI only; failures must not block core workflows.
- UI behavior: show last successful balance with timestamp, and note if the current fetch fails.

## Parameter compatibility

- Some models reject `temperature`; do not pass it unless verified for the specific model.
- Prefer schema-constrained outputs; avoid free-form output when strict parsing is required.
- Keep the API surface consistent (Responses API vs Chat Completions) per model.

## Image handling rules

- Use base64 data URLs with `data:image/jpeg;base64,...`.
- Resize to `BHP_OPENAI_TAGGING_IMAGE_MAX_WIDTH` and convert to RGB.
- Keep JPEG quality moderate (current: quality 72) to reduce payload size.

## TLS and certificate handling

- If TLS inspection is present, use `BHP_OPENAI_CA_BUNDLE` so `httpx` can verify certs.
- For balance calls, use the same CA bundle if it exists.
- Keep `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE` in mind for other tooling.

## Token usage and budgets

- Token usage is tracked in `OpenAIUsage` and exposed via `/api/v1/openai/usage`.
- Maintain `BHP_OPENAI_TOKEN_BUDGET` for admin warnings.
- Enforce budget limits using internal usage tracking + approvals, not the balance endpoint.

## Known lessons learned

- Some GPT-5 models reject `temperature` and will error if it is passed.
- TLS errors can occur behind SSL inspection; use `BHP_OPENAI_CA_BUNDLE`.

## Test and validation checklist

- Run `apps/api/scripts/autotag_smoke.py` after any model or SDK change.
- Run `apps/api/scripts/autotag_workflow.py` for end-to-end validation.
- Verify JSON parsing and tag persistence on a single image before batch runs.

## Migration process (when changing SDK or model)

1. Update `apps/api/requirements.txt` and pin the new SDK version.
2. Update defaults in `apps/api/app/core/settings.py` if model or schema changes.
3. Update this doc and `docs/AI Tagging and Taxonomy.md` with new version details.
4. Run the smoke tests and a small real tagging job.
5. Record any new behaviors in the lessons learned section.

## Open questions to confirm with the pinned SDK

- Which GPT-5 models support temperature and other generation params.
- Responses API schema support across models used in this repo.
- Long-term stability of the billing balance endpoint.
