#!/bin/zsh
set -euo pipefail

worklog_path="docs/WORKLOG.md"
today="$(date +%Y-%m-%d)"

echo "Session stop: write a short summary for the work log."
echo "Leave a blank line to finish."

summary_lines=()
if [ -n "${SUMMARY:-}" ]; then
  while IFS= read -r line; do
    summary_lines+=("$line")
  done <<< "${SUMMARY}"
else
  while IFS= read -r line; do
    [ -z "$line" ] && break
    summary_lines+=("$line")
  done
fi

{
  echo ""
  echo "## ${today}"
  if [ ${#summary_lines[@]} -gt 0 ]; then
    echo "- What I worked on:"
    for line in "${summary_lines[@]}"; do
      echo "  - ${line}"
    done
  else
    echo "- What I worked on:"
    echo "  - [add summary]"
  fi
  echo "- Current status:"
  echo "  - [update status]"
  echo "- Next step:"
  echo "  - [add next step]"
  echo "- Notes/decisions:"
  echo "  - [add notes]"
} >> "${worklog_path}"

make infra-down

echo ""
echo "Remember to update docs if requirements or architecture changed."
