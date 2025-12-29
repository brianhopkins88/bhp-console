#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

echo "Creating test run..."
test_response=$(
  curl -s -X POST "$API_BASE/site/tests" \
    -H "Content-Type: application/json" \
    -d '{"version":"v1","environment":"staging","status":"running","summary":"starting","results":{"checks":[]}}'
)
echo "$test_response" | python3 -m json.tool
test_id=$(echo "$test_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "Updating test run..."
curl -s -X PATCH "$API_BASE/site/tests/$test_id" \
  -H "Content-Type: application/json" \
  -d '{"status":"passed","summary":"ok","results":{"checks":[{"name":"lint","status":"passed"}]}}' \
  | python3 -m json.tool

echo "Creating deployment..."
deploy_response=$(
  curl -s -X POST "$API_BASE/site/deployments" \
    -H "Content-Type: application/json" \
    -d '{"environment":"staging","version":"v1","status":"completed","record_metadata":{"source":"smoke"}}'
)
echo "$deploy_response" | python3 -m json.tool

echo "Creating second deployment (rollback target should be v1)..."
deploy_response2=$(
  curl -s -X POST "$API_BASE/site/deployments" \
    -H "Content-Type: application/json" \
    -d '{"environment":"staging","version":"v2","status":"completed","record_metadata":{"source":"smoke"}}'
)
echo "$deploy_response2" | python3 -m json.tool

rollback=$(echo "$deploy_response2" | python3 -c "import sys, json; print(json.load(sys.stdin)['rollback_version'])")
if [ "$rollback" != "v1" ]; then
  echo "Expected rollback_version v1, got $rollback" >&2
  exit 1
fi

echo "Smoke test complete."
