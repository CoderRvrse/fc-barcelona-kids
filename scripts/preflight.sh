#!/usr/bin/env bash
set -euo pipefail

echo "== JS parse gate =="
shopt -s nullglob
js=(scripts/*.js scripts/**/*.js)
for f in "${js[@]:-}"; do node --check "$f"; done

echo "== Quick markers =="
grep -q 'id="hero' index.html || { echo "Missing hero marker"; exit 1; }

echo "OK ✅"