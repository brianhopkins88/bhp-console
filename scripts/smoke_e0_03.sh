#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

run_id=$(
  curl -s -X POST "$API_BASE/agent-runs" \
    -H "Content-Type: application/json" \
    -d '{"goal":"smoke test","plan":[{"step":"one"}],"run_metadata":{"source":"script"}}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created run: $run_id"

step_id=$(
  curl -s -X POST "$API_BASE/agent-runs/$run_id/steps" \
    -H "Content-Type: application/json" \
    -d '{"index":0,"label":"step one","status":"running","input":{"foo":"bar"}}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created step: $step_id"

tool_id=$(
  curl -s -X POST "$API_BASE/agent-runs/$run_id/tool-calls" \
    -H "Content-Type: application/json" \
    -d "{\"step_id\":$step_id,\"tool_name\":\"smoke.test\",\"status\":\"completed\",\"correlation_id\":\"abc123\",\"input\":{\"ping\":true},\"output\":{\"pong\":true},\"duration_ms\":12}" \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created tool call: $tool_id"

approval_id=$(
  curl -s -X POST "$API_BASE/approvals" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"smoke.action\",\"proposal\":{\"note\":\"test\"},\"requester\":\"smoke\",\"run_id\":\"$run_id\",\"tool_call_id\":$tool_id}" \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created approval: $approval_id"

curl -s -X POST "$API_BASE/approvals/$approval_id/decision" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","decided_by":"smoke","decision_notes":"ok","outcome":{"ok":true}}' \
  | python3 -m json.tool

curl -s "$API_BASE/agent-runs/$run_id" | python3 -m json.tool

echo "Smoke test complete."
