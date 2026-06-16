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
import { preprocessSpec, rewriteUnionsAsDiscriminated, relaxResponseStrict } from './lib/preprocess.mjs'
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

  return '// Auto-generated Zod schemas from OpenAPI spec. DO NOT EDIT.\n' +
    kept.join('\n') + '\n'
}

/**
 * openapi-zod-client emits Zod 3 syntax (`z.record(valueSchema)`), but the
 * SDK depends on Zod 4 which requires `z.record(keySchema, valueSchema)`.
 * Rewrite each call so the generated file passes `tsc` without
 * `@ts-nocheck` (P5: zero casts/escapes outside generated files — and
 * `@ts-nocheck` is the strongest possible escape).
 *
 * Pattern: capture `z.record(<balanced expression>)` and inject the
 * `z.string()` key. We accept the heuristic limitation that the value
 * expression cannot itself contain unbalanced parens; that's true for
 * every emission shape openapi-zod-client produces.
 */
function fixZod4RecordCalls(source) {
  // Match both `z.record(` and the prettier-split form
  // `z\n  .record(`. Skip ranges that already have the Zod 4
  // `(z.string(), …)` signature so repeated passes are a no-op.
  const RECORD_RE = /(\bz)(\s*)\.record\(/g
  const ALREADY_FIXED = 'z.string(), '

  function pass(input) {
    let out = ''
    let changed = false
    let cursor = 0
    let m
    RECORD_RE.lastIndex = 0
    while ((m = RECORD_RE.exec(input))) {
      const matchStart = m.index
      const openIdx = matchStart + m[0].length // index AFTER '('
      out += input.slice(cursor, openIdx)
      // Look at the next non-whitespace token to detect "already fixed".
      let peek = openIdx
      while (peek < input.length && /\s/.test(input[peek])) peek++
      if (input.startsWith(ALREADY_FIXED, peek)) {
        cursor = openIdx
        continue
      }
      out += 'z.string(), '
      changed = true
      let depth = 1
      let j = openIdx
      while (j < input.length && depth > 0) {
        const ch = input[j]
        if (ch === '(') depth++
        else if (ch === ')') depth--
        if (depth > 0) out += ch
        j++
      }
      out += ')'
      cursor = j
      RECORD_RE.lastIndex = cursor
    }
    out += input.slice(cursor)
    return {out, changed}
  }

  // openapi-zod-client occasionally nests `z.record` inside another
  // `z.record` value; one pass only rewrites the outermost call. Iterate
  // to a fixed point.
  let current = source
  for (let safety = 0; safety < 16; safety++) {
    const {out, changed} = pass(current)
    current = out
    if (!changed) return current
  }
  throw new Error('fixZod4RecordCalls did not converge after 16 passes')
}

async function main() {
  console.log('Reading OpenAPI spec...')
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))

  console.log('Preprocessing (via @devhelm/openapi-tools)...')
  const {
    flattened,
    inlinedDiscriminators,
    inlinedNullableDeductions,
    relaxedEnums,
  } = preprocessSpec(spec)
  if (flattened.length > 0) {
    console.log(`  Flattened circular oneOf: ${flattened.join(', ')}`)
  }
  if (inlinedDiscriminators.length > 0) {
    console.log(
      `  Inlined discriminator subtypes: ${inlinedDiscriminators
        .map((u) => `${u.parent}(${u.discriminator})`)
        .join(', ')}`,
    )
  }
  if (inlinedNullableDeductions && inlinedNullableDeductions.length > 0) {
    console.log(
      `  Inlined nullable deduction refs for: ${inlinedNullableDeductions.join(', ')}`,
    )
  }
  if (relaxedEnums && relaxedEnums.length > 0) {
    console.log(
      `  Relaxed response-DTO enums (Postel's Law): ${relaxedEnums.length} fields`,
    )
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
      // Strict objects — generated `.passthrough()` masks unknown fields
      // and breaks `z.infer` narrowing for SDK consumers. Required so
      // `z.union([...])` over polymorphic subtypes rejects wrong variants
      // instead of silently stripping extras.
      additionalPropertiesDefaultValue: false,
      strictObjects: true,
    },
  })

  console.log('Post-processing: extracting Zod schemas...')
  const raw = readFileSync(tempGenerated, 'utf8')
  let clean = extractSchemas(raw)
  clean = rewriteUnionsAsDiscriminated(clean, inlinedDiscriminators)
  clean = relaxResponseStrict(clean)
  clean = fixZod4RecordCalls(clean)

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
