#!/usr/bin/env bash
# Runs every workflow through the headless harness. Usage: scripts/run-all.sh [port] [speed]
PORT=${1:-5173}; SPEED=${2:-8}
IDS=$(grep -ho "^    id: '[a-z0-9-]*'" src/workflows/*.ts | sed "s/.*id: '\(.*\)'/\1/")
pass=0; fail=0
for id in $IDS; do
  out=$(node scripts/run-workflow.mjs "$id" --port "$PORT" --speed "$SPEED" --timeout 300 2>&1 | tail -1)
  echo "$out"
  [[ $out == PASS* ]] && pass=$((pass+1)) || fail=$((fail+1))
done
echo "== $pass passed, $fail failed"
