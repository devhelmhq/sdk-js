/**
 * Bundle conformance vectors (doc 42 §5.3, W0-9): docs/contracts/bundle-vectors.json
 * is written by the server's own digest and closure implementation and
 * vendored by scripts/regen-from.sh. The Node bundler must produce the same
 * closure, digest and upload digest, and the same refusals.
 */
import {describe, expect, it} from 'vitest'
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {checkBundle, computeDigestSync, resolveBundle, RUNTIME_CATALOG, selectRuntime, type BundleFiles} from '../src/bundler/index.js'

interface Vector {
  name: string
  request: {entrypoint?: string | null; include?: string[]; files: Record<string, string>; binaryFiles?: Record<string, string>; symlinks?: Record<string, string>}
  expect: {entrypoint?: string | null; digest?: string; uploadDigest?: string; files?: string[]; refusal?: {code: string}}
}

const vectors = (JSON.parse(readFileSync(new URL('../docs/contracts/bundle-vectors.json', import.meta.url), 'utf8')) as {vectors: Vector[]}).vectors
const runtime = selectRuntime(RUNTIME_CATALOG) ?? null

function allFiles(v: Vector): BundleFiles {
  const files: BundleFiles = {...v.request.files}
  for (const [p, b64] of Object.entries(v.request.binaryFiles ?? {})) files[p] = new Uint8Array(Buffer.from(b64, 'base64'))
  return files
}

describe('bundle conformance vectors', () => {
  it('covers the required cases', () => {
    expect(vectors.map((v) => v.name)).toEqual(expect.arrayContaining([
      'crlf-text', 'binary-file', 'non-ascii-path', 'tsconfig-paths', 'json-import', 'setup-file', 'symlink-refused', 'import-outside-set-refused', 'include-set',
    ]))
  })

  for (const v of vectors) {
    it(v.name, async () => {
      const files = allFiles(v)
      if (v.expect.uploadDigest) expect(computeDigestSync(files)).toBe(v.expect.uploadDigest)
      const root = mkdtempSync(join(tmpdir(), 'devhelm-vector-'))
      try {
        mkdirSync(join(root, '.git'))
        for (const [p, c] of Object.entries(files)) {
          mkdirSync(dirname(join(root, p)), {recursive: true})
          writeFileSync(join(root, p), c)
        }
        for (const [link, target] of Object.entries(v.request.symlinks ?? {})) symlinkSync(target, join(root, link))
        const entry = v.request.entrypoint
        if (!entry) {
          if (v.expect.refusal) {
            const result = await checkBundle(join(root, Object.keys(v.request.files)[0] ?? ''), {runtime, source: false, cwd: root, include: ['**']})
            expect(result.errors.map((f) => f.code)).toContain(v.expect.refusal.code)
            return
          }
          // No entrypoint: the API keeps the whole set (several sources), so the
          // closure digest is the digest of every file sent.
          expect(v.expect.digest).toBe(computeDigestSync(files))
          expect(Object.keys(files).sort()).toEqual([...(v.expect.files ?? Object.keys(files))].sort())
          return
        }
        // The vector's file map is the candidate set the closure is drawn
        // from: the in-memory `{entrypoint, files}` form.
        const result = await checkBundle({entrypoint: entry, files, include: v.request.include}, {runtime, source: false})
        if (v.expect.refusal) {
          expect(result.errors.map((f) => f.code)).toContain(v.expect.refusal.code)
          return
        }
        expect(result.errors).toEqual([])
        expect(result.bundle?.entrypoint).toBe(v.expect.entrypoint)
        expect(result.bundle?.fileList).toEqual(v.expect.files)
        expect(result.bundle?.digest).toBe(v.expect.digest)
        // The same closure from disk (the root is the candidate set; include globs are root-relative).
        const disk = await checkBundle(join(root, entry), {runtime, source: false, root, cwd: root, include: v.request.include})
        expect(disk.errors).toEqual([])
        expect(disk.bundle?.fileList).toEqual(v.expect.files)
        expect(disk.bundle?.digest).toBe(v.expect.digest)
      } finally {
        rmSync(root, {recursive: true, force: true})
      }
    })
  }

  it('refuses a symlink named in an explicit include list (CLI form)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devhelm-vector-'))
    try {
      mkdirSync(join(root, 'checks'), {recursive: true})
      writeFileSync(join(root, 'checks/a.spec.ts'), "import { test } from '@playwright/test';\n")
      symlinkSync('a.spec.ts', join(root, 'checks/link.ts'))
      const input = {entrypoint: 'checks/a.spec.ts', include: ['checks/a.spec.ts', 'checks/link.ts']}
      const result = await checkBundle(input, {runtime, source: false, cwd: root, root})
      expect(result.bundle).toBeNull()
      expect(result.errors).toEqual([expect.objectContaining({code: 'MONITOR_PACKAGE_PATH_INVALID', rule: 'symlink', file: 'checks/link.ts'})])
      await expect(resolveBundle(input, {runtime, source: false, cwd: root, root})).rejects.toMatchObject({code: 'MONITOR_PACKAGE_PATH_INVALID'})
    } finally {
      rmSync(root, {recursive: true, force: true})
    }
  })
})
