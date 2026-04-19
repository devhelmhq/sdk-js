#!/usr/bin/env node
/**
 * Generates Zod schemas from the committed OpenAPI spec.
 *
 * Pipeline:
 *   1. Read docs/openapi/monitoring-api.json
 *   2. Preprocess via @devhelm/openapi-tools (shared with all surfaces)
 *   3. Run openapi-zod-client → temp generated file
 *   4. Post-process: strip Zodios/API client parts, keep only Zod schemas
 *   5. Write src/generated/schemas.ts
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preprocessSpec } from '@devhelm/openapi-tools/preprocess'
import { generateZodClientFromOpenAPI } from 'openapi-zod-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SPEC_PATH = join(ROOT, 'docs/openapi/monitoring-api.json')
const OUTPUT_PATH = join(ROOT, 'src/generated/schemas.ts')

function extractSchemas(raw) {
  const lines = raw.split('\n')
  const kept = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('const endpoints = makeApi') || line.startsWith('export const api')) {
      break
    }

    if (line.includes('@zodios/core')) continue

    kept.push(line)
  }

  return '// @ts-nocheck\n// Auto-generated Zod schemas from OpenAPI spec. DO NOT EDIT.\n' +
    kept.join('\n') + '\n'
}

async function main() {
  console.log('Reading OpenAPI spec...')
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))

  console.log('Preprocessing (via @devhelm/openapi-tools)...')
  const { flattened } = preprocessSpec(spec)
  if (flattened.length > 0) {
    console.log(`  Flattened circular oneOf: ${flattened.join(', ')}`)
  }

  const tempSpec = join(ROOT, '.openapi-preprocessed.json')
  const tempGenerated = join(ROOT, '.schemas-raw.ts')

  writeFileSync(tempSpec, JSON.stringify(spec, null, 2), 'utf8')

  console.log('Running openapi-zod-client...')
  await generateZodClientFromOpenAPI({
    openApiDoc: spec,
    distPath: tempGenerated,
    options: {
      shouldExportAllSchemas: true,
    },
  })

  console.log('Post-processing: extracting Zod schemas...')
  const raw = readFileSync(tempGenerated, 'utf8')
  const clean = extractSchemas(raw)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, clean, 'utf8')

  try { unlinkSync(tempSpec) } catch {}
  try { unlinkSync(tempGenerated) } catch {}

  const schemaCount = (clean.match(/^const /gm) || []).length
  console.log(`Done: ${schemaCount} schemas → ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
