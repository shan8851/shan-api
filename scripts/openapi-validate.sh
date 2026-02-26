#!/usr/bin/env bash
set -euo pipefail

SPEC_PATH="openapi/v1.yaml"
TMP_BUNDLE_PATH="$(mktemp /tmp/shan-api-openapi-validate.XXXXXX.yaml)"

redocly bundle "$SPEC_PATH" --output "$TMP_BUNDLE_PATH" >/dev/null
rm -f "$TMP_BUNDLE_PATH"

echo "[openapi] validation succeeded for $SPEC_PATH"
