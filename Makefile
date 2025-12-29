SHELL := /bin/zsh

infra-up:
	docker compose -f infra/docker-compose.yml up -d

infra-down:
	docker compose -f infra/docker-compose.yml down

api:
	. .venv/bin/activate && cd apps/api && uvicorn app.main:app --reload --port 8001

test-api:
	. .venv/bin/activate && cd apps/api && pytest

migrate:
	. .venv/bin/activate && python -m alembic upgrade head

ui:
	cd apps/ui && npm run dev

dev:
	@echo "Run these in separate terminals:"
	@echo "  make infra-up"
	@echo "  make api"
	@echo "  make ui"

start: infra-up
	@echo "Start API/UI in separate terminals:"
	@echo "  make api"
	@echo "  make ui"

stop: infra-down
	@echo "Stop API/UI terminals with Ctrl+C."

session-start:
	./scripts/session_start.sh

session-stop:
	./scripts/session_stop.sh

seed-staging:
	@if [ -z "$$BHP_SEED_UPLOAD_DIR" ]; then \
		echo "Set BHP_SEED_UPLOAD_DIR=$(PWD)/storage/library/originals"; \
		exit 1; \
	fi
	@API_BASE_URL="$${BHP_SEED_API_BASE_URL:-https://bhp-console.onrender.com}"; \
	PYTHON_BIN="$${BHP_SEED_PYTHON_BIN:-python}"; \
	ARGS=(--api-base-url "$$API_BASE_URL" --dir "$$BHP_SEED_UPLOAD_DIR"); \
	if [ -n "$$BHP_SEED_TAGS" ]; then ARGS+=(--tags "$$BHP_SEED_TAGS"); fi; \
	if [ -n "$$BHP_SEED_LIMIT" ]; then ARGS+=(--limit "$$BHP_SEED_LIMIT"); fi; \
	if [ "$${BHP_SEED_NO_DERIVATIVES:-0}" = "1" ]; then ARGS+=(--no-derivatives); fi; \
	$$PYTHON_BIN apps/api/scripts/seed_staging_uploads.py "$${ARGS[@]}"

smoke-e0-03:
	API_BASE="$${API_BASE:-http://localhost:8001/api/v1}" ./scripts/smoke_e0_03.sh

smoke-e0-04:
	API_BASE="$${API_BASE:-http://localhost:8001/api/v1}" ./scripts/smoke_e0_04.sh

smoke-e0-05:
	API_BASE="$${API_BASE:-http://localhost:8001/api/v1}" ./scripts/smoke_e0_05.sh

smoke-e0-06-07:
	API_BASE="$${API_BASE:-http://localhost:8001/api/v1}" ./scripts/smoke_e0_06_07.sh
