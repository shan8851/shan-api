#!/usr/bin/env bash
set -euo pipefail

BASELINE_SPEC_PATH="openapi/baseline/v1.yaml"
CURRENT_SPEC_PATH="openapi/v1.yaml"

if [[ ! -f "$BASELINE_SPEC_PATH" ]]; then
  echo "[openapi] baseline spec missing at $BASELINE_SPEC_PATH; skipping breaking-change check."
  exit 0
fi

openapi-diff "$BASELINE_SPEC_PATH" "$CURRENT_SPEC_PATH"
