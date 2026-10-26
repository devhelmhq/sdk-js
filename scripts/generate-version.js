#!/usr/bin/env node
/**
 * Writes src/generated/version.ts from package.json so the version is a
 * plain constant: no `node:module` / `createRequire` at runtime, which keeps
 * the browser entry (`@devhelm/sdk/web`) free of Node built-ins.
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const {version} = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const out = join(ROOT, 'src/generated/version.ts')
mkdirSync(dirname(out), {recursive: true})
writeFileSync(out, `// Auto-generated from package.json by scripts/generate-version.js. DO NOT EDIT.\nexport const SDK_VERSION = ${JSON.stringify(version)}\n`)
console.log(`Done: SDK_VERSION=${version} → ${out}`)
