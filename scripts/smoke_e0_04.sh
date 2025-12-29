#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

curl -s -X POST "$API_BASE/site/business-profile" \
  -H "Content-Type: application/json" \
  -d '{"name":"BHP","description":"Portrait photography","profile_data":{"services":["family","graduation"]}}' \
  | python3 -m json.tool

curl -s "$API_BASE/site/business-profile" | python3 -m json.tool

curl -s -X POST "$API_BASE/site/structure" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","structure_data":{"pages":[{"id":"home","title":"Home","slug":"/"}]}}' \
  | python3 -m json.tool

curl -s "$API_BASE/site/structure" | python3 -m json.tool

curl -s -X POST "$API_BASE/site/taxonomy" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","taxonomy_data":{"tags":[{"id":"family","label":"Family","parent_id":null}]}}' \
  | python3 -m json.tool

curl -s "$API_BASE/site/taxonomy" | python3 -m json.tool

echo "Smoke test complete."
