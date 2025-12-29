# Vector Memory Setup (pgvector)

This project uses pgvector for semantic memory. Do not store database credentials in docs.

## Local dev

- `infra/docker-compose.yml` uses `pgvector/pgvector:pg16`.
- Run `make infra-up`, then apply migrations with `make migrate`.

## Staging (Render Postgres)

- Use the **External Database URL** from Render (keep it in secrets, not docs).
- Enable the extension:

```bash
psql "<EXTERNAL_DATABASE_URL>?sslmode=require" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

If the URL already includes `?`, append `&sslmode=require` instead.
