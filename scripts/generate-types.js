#!/usr/bin/env node
/**
 * Generates TypeScript types from the OpenAPI spec via openapi-typescript.
 *
 * Pipeline:
 *   1. Read docs/openapi/monitoring-api.json
 *   2. Preprocess via @devhelm/openapi-tools (shared with all surfaces)
 *   3. Write preprocessed spec to temp file
 *   4. Run openapi-typescript on the preprocessed spec
 *   5. Clean up temp file
 *
 * This ensures compile-time TS types match the runtime Zod schemas
 * (both consume the same preprocessed spec).
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { preprocessSpec } from './lib/preprocess.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SPEC_PATH = join(ROOT, 'docs/openapi/monitoring-api.json')
const PREPROCESSED_PATH = join(ROOT, '.openapi-preprocessed.json')
const OUTPUT_PATH = join(ROOT, 'src/generated/api.ts')

console.log('Reading OpenAPI spec...')
const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))

console.log('Preprocessing (via @devhelm/openapi-tools)...')
const { flattened } = preprocessSpec(spec)
if (flattened.length > 0) {
  console.log(`  Flattened circular oneOf: ${flattened.join(', ')}`)
}

writeFileSync(PREPROCESSED_PATH, JSON.stringify(spec, null, 2), 'utf8')

console.log('Running openapi-typescript...')
try {
  execSync(
    `npx openapi-typescript "${PREPROCESSED_PATH}" -o "${OUTPUT_PATH}"`,
    { stdio: 'inherit', cwd: ROOT },
  )
} finally {
  try { unlinkSync(PREPROCESSED_PATH) } catch {}
}

console.log(`Done: ${OUTPUT_PATH}`)
