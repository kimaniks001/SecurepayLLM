#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-project-bolt-sb1-8wcnp3ss.zip}"
EXPECTED_SHA256="2f6c28bd28c80af806217e94e722f5b2498b187a865a44a3d0a7d9cbb0c5b14d"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Missing Bolt export: $ZIP_PATH" >&2
  exit 1
fi

ACTUAL_SHA256="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Bolt export checksum mismatch." >&2
  echo "Expected: $EXPECTED_SHA256" >&2
  echo "Actual:   $ACTUAL_SHA256" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

unzip -q "$ZIP_PATH" -d "$TMP_DIR"

if [[ ! -d "$TMP_DIR/project" ]]; then
  echo "Expected project/ root inside Bolt export." >&2
  exit 1
fi

# Preserve repository support files while importing the Bolt export itself unchanged.
rsync -a --exclude='.git' "$TMP_DIR/project/" ./

echo "Frozen Bolt reference imported successfully."
echo "SHA-256: $ACTUAL_SHA256"
