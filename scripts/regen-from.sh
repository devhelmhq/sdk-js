#!/usr/bin/env bash
#
# Regenerate src/generated/{api.ts,schemas.ts} from an arbitrary spec file.
#
# Usage: scripts/regen-from.sh <path-to-spec.json>
#
# Per-artifact entry point for the spec-evolution harness
# (`mono/tests/surfaces/evolution/`). The harness handles backup/restore of
# the vendored spec.
#
# Behavior:
#   - copies <path-to-spec.json> over docs/openapi/monitoring-api.json
#   - runs typegen + schemagen
#   - prints absolute path to src/generated/api.ts on stdout
#
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <path-to-spec.json>" >&2
  exit 1
fi

INPUT_SPEC="$1"
if [[ ! -f "$INPUT_SPEC" ]]; then
  echo "error: spec not found at $INPUT_SPEC" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_SPEC="$ROOT_DIR/docs/openapi/monitoring-api.json"
OUTPUT="$ROOT_DIR/src/generated/api.ts"

# Skip the copy when the caller passes the vendored spec back in (harness
# post-session teardown re-regens from the restored baseline).
INPUT_ABS="$(cd "$(dirname "$INPUT_SPEC")" && pwd)/$(basename "$INPUT_SPEC")"
TARGET_ABS="$(cd "$(dirname "$TARGET_SPEC")" && pwd)/$(basename "$TARGET_SPEC")"
if [[ "$INPUT_ABS" != "$TARGET_ABS" ]]; then
  cp "$INPUT_SPEC" "$TARGET_SPEC"
fi

cd "$ROOT_DIR"
npm run typegen >&2
npm run schemagen >&2
# Compile to dist/ as well so the evolution harness can `node -e` against
# the just-regenerated build via `import('@devhelm/sdk')` from
# `dist/index.js`. Without this step, only TypeScript sources change and
# any node-based snippet runner sees a stale dist.
npx --no-install tsc -b >&2

echo "$OUTPUT"
