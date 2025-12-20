SHELL := /bin/zsh

infra-up:
	docker compose -f infra/docker-compose.yml up -d

infra-down:
	docker compose -f infra/docker-compose.yml down

api:
	. .venv/bin/activate && cd apps/api && uvicorn app.main:app --reload --port 8001

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
