/**
 * Contract (doc 42 §5.1.2): the public type surface of every entry point has
 * no `any` or `unknown`. Runs against dist/ (CI builds before testing).
 */
import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
// @ts-expect-error plain ESM script without declarations
import {checkPublicTypes} from '../scripts/check-public-types.js'

describe('public type surface', () => {
  it.skipIf(!existsSync(new URL('../dist/index.d.ts', import.meta.url)))('has no any/unknown in dist/*.d.ts', () => {
    expect((checkPublicTypes as () => string[])()).toEqual([])
  }, 120_000)
})
