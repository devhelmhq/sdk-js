import {createRequire} from 'node:module'

// Resolve the @devhelm/sdk version from package.json once at module load.
// createRequire(import.meta.url) gives us a CommonJS-style require anchored
// at this file's URL so the relative path stays valid both in src/ (during
// vitest runs) and in dist/ (after tsc emits compiled output) — package.json
// sits one level above either location.
//
// Why not import package.json with assertions: `with { type: 'json' }` is
// only stable on Node ≥ 20.10 and downstream bundlers (esbuild, Bun)
// handle it inconsistently. createRequire is universally supported on every
// Node version this SDK targets and adds zero build-time machinery.
const require = createRequire(import.meta.url)
const pkg = require('../package.json') as {version?: string}

export const SDK_VERSION: string = pkg.version ?? 'unknown'
