#!/usr/bin/env node
/**
 * Generates Zod schemas from the committed OpenAPI spec.
 *
 * Pipeline:
 *   1. Read docs/openapi/monitoring-api.json
 *   2. Preprocess (setRequiredFields, pushRequiredIntoAllOf, flattenCircularOneOf)
 *   3. Run openapi-zod-client → temp generated file
 *   4. Post-process: strip Zodios/API client parts, keep only Zod schemas
 *   5. Write src/generated/schemas.ts
 *
 * Preprocessing mirrors the dashboard's sync-schema.js so Zod output is
 * compatible across surfaces.
 */

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SPEC_PATH = join(ROOT, 'docs/openapi/monitoring-api.json')
const TEMP_SPEC = join(ROOT, '.openapi-preprocessed.json')
const TEMP_GENERATED = join(ROOT, '.schemas-raw.ts')
const OUTPUT_PATH = join(ROOT, 'src/generated/schemas.ts')

// ── Preprocessing (ported from dashboard sync-schema.js) ────────────

function setRequiredFields(spec) {
  const schemas = spec.components?.schemas ?? {}
  for (const schema of Object.values(schemas)) {
    if (schema.type !== 'object' || !schema.properties) continue

    if (Array.isArray(schema.required)) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.nullable) continue
        if (schema.required.includes(prop)) continue
        if (propSchema.allOf) continue
        if ('default' in propSchema) continue
        schema.required.push(prop)
      }
      continue
    }

    const required = []
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (propSchema.nullable) continue
      if (propSchema.allOf) continue
      if ('default' in propSchema) continue
      required.push(prop)
    }
    if (required.length > 0) {
      schema.required = required
    }
  }
}

function pushRequiredIntoAllOf(spec) {
  const schemas = spec.components?.schemas ?? {}
  for (const schema of Object.values(schemas)) {
    if (!Array.isArray(schema.required) || !Array.isArray(schema.allOf)) continue
    for (const member of schema.allOf) {
      if (!member.properties) continue
      const memberRequired = []
      for (const field of schema.required) {
        if (field in member.properties) {
          memberRequired.push(field)
        }
      }
      if (memberRequired.length > 0) {
        member.required = member.required
          ? [...new Set([...member.required, ...memberRequired])]
          : memberRequired
      }
    }
  }
}

function flattenCircularOneOf(spec) {
  const schemas = spec.components?.schemas ?? {}
  for (const [name, schema] of Object.entries(schemas)) {
    if (!Array.isArray(schema.oneOf)) continue
    const isCircular = schema.oneOf.some((member) => {
      const refName = member.$ref?.split('/').pop()
      const refSchema = refName && schemas[refName]
      if (!refSchema || !Array.isArray(refSchema.allOf)) return false
      return refSchema.allOf.some((a) => a.$ref === `#/components/schemas/${name}`)
    })
    if (isCircular) {
      delete schema.oneOf
      console.log(`  Flattened circular oneOf: ${name}`)
    }
  }
}

// ── Post-processing: extract only Zod schemas ───────────────────────

// fixMissingNullable — REMOVED.
// The root cause (Lombok not copying @Nullable to getters) was fixed in the API
// by adding `jakarta.annotation.Nullable` to lombok.copyableAnnotations. The
// generated OpenAPI spec now correctly marks nullable fields via the existing
// PropertyCustomizer in OpenApiConfig.java. All DTO fields also have explicit
// @Nullable or @NotNull/@NotBlank annotations, enforced by DtoAnnotationTest.

function extractSchemas(raw) {
  const lines = raw.split('\n')
  const kept = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Stop before the Zodios endpoints/client definition
    if (line.startsWith('const endpoints = makeApi') || line.startsWith('export const api')) {
      break
    }

    // Skip the @zodios/core import
    if (line.includes('@zodios/core')) continue

    kept.push(line)
  }

  return '// @ts-nocheck\n// Auto-generated Zod schemas from OpenAPI spec. DO NOT EDIT.\n' +
    kept.join('\n') + '\n'
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading OpenAPI spec...')
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))

  console.log('Preprocessing...')
  setRequiredFields(spec)
  pushRequiredIntoAllOf(spec)
  flattenCircularOneOf(spec)

  writeFileSync(TEMP_SPEC, JSON.stringify(spec, null, 2), 'utf8')
  console.log('Wrote preprocessed spec')

  console.log('Running openapi-zod-client...')
  await new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['openapi-zod-client', TEMP_SPEC, '-o', TEMP_GENERATED, '--export-schemas'],
      { cwd: ROOT, stdio: 'inherit', shell: true },
    )
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit code ${code}`))))
  })

  console.log('Post-processing: extracting Zod schemas...')
  const raw = readFileSync(TEMP_GENERATED, 'utf8')
  const clean = extractSchemas(raw)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, clean, 'utf8')

  // Clean up temp files
  try { unlinkSync(TEMP_SPEC) } catch {}
  try { unlinkSync(TEMP_GENERATED) } catch {}

  const schemaCount = (clean.match(/^const /gm) || []).length
  console.log(`Done: ${schemaCount} schemas → ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
