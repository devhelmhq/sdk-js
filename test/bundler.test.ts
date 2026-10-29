/**
 * The Node bundler (`@devhelm/sdk/bundler`, doc 42 §5.3, doc 32 D-12):
 * digest framing, closure resolution, refusals, runtime import checks,
 * limits, the literal-secret scan, keys and source detection.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {execFileSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {
  BUNDLE_LIMITS,
  BundleError,
  RUNTIME_CATALOG,
  checkBundle,
  computeDigest,
  computeDigestSync,
  digestFrame,
  repoFromRemote,
  resolveBundle,
  scanKeys,
  scanSecrets,
  selectRuntime,
  shannonEntropy,
  toCreateBundleRequest,
  zipBundle,
  type BundleFinding,
  type RuntimePackages,
} from '../src/bundler/index.js'
import {computeDigestWith, webSha256} from '../src/bundler/digest.js'
import {checkInMemory} from '../src/bundler/core.js'
import {nodeSha256} from '../src/bundler/index.js'
import {IgnoreMatcher, compileGlob} from '../src/bundler/glob.js'

// Expected digests computed by an independent implementation of D-12
// (Python, hashlib + struct) over the same bytes.
const VECTORS: Array<{name: string; files: Record<string, string | Uint8Array>; digest: string}> = [
  {
    name: 'crlf',
    files: {'a.spec.ts': "import x from './b'\r\nconsole.log(x)\r\n", 'b.ts': 'export default 1\r\n'},
    digest: 'sha256:3bbcb5b9d59de9ac242455e3b705c95828dad13d10c60870391104a371969286',
  },
  {
    name: 'binary',
    files: {
      'a.spec.ts': "test('x', () => {})\n",
      'logo.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0x0d, 0x0a]),
    },
    digest: 'sha256:46387034714588f4ba56b4048b801e006aa2f0f1f3d76a76433852b263993693',
  },
  {
    name: 'non-ascii path, UTF-8 byte order',
    files: {'tests/café.spec.ts': '// café\n', 'Z.ts': 'z', 'a.ts': 'a'},
    digest: 'sha256:d594c23f87a723f94e374bd5f55bb6cb1be8ed658ee5def1cacf0ac8117000ef',
  },
  {name: 'empty file', files: {'a.ts': ''}, digest: 'sha256:abf159d8c43d2156982d4d2a44def17c391648fdb5e867a9c9365be4d061b520'},
]

describe('D-12 digest', () => {
  for (const v of VECTORS) {
    it(`matches the reference digest: ${v.name}`, async () => {
      expect(await computeDigest(v.files)).toBe(v.digest)
      expect(computeDigestSync(v.files)).toBe(v.digest)
      expect(await computeDigestWith(v.files, webSha256)).toBe(v.digest)
    })
  }

  it('frames u32be path length, path, u64be content length, content', () => {
    const frame = digestFrame({'a.ts': 'xy'})
    expect(Array.from(frame)).toEqual([0, 0, 0, 4, 0x61, 0x2e, 0x74, 0x73, 0, 0, 0, 0, 0, 0, 0, 2, 0x78, 0x79])
  })

  it('normalizes CRLF only for text extensions', async () => {
    const lf = await computeDigest({'a.txt': 'a\nb\n'})
    expect(await computeDigest({'a.txt': 'a\r\nb\r\n'})).toBe(lf)
    expect(await computeDigest({'a.bin': 'a\r\nb\r\n'})).not.toBe(await computeDigest({'a.bin': 'a\nb\n'}))
  })

  it('does not depend on map insertion order', async () => {
    expect(await computeDigest({'b.ts': '1', 'a.ts': '2'})).toBe(await computeDigest({'a.ts': '2', 'b.ts': '1'}))
  })
})

let root: string

function write(rel: string, content: string | Uint8Array): void {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), {recursive: true})
  writeFileSync(abs, content)
}

const RUNTIME: RuntimePackages = {
  id: 'test-rt',
  packages: {'@playwright/test': '1.62.1', zod: '3.24.3'},
  nodeBuiltins: ['fs', 'path', 'crypto'],
}

function codes(findings: BundleFinding[]): string[] {
  return findings.filter((f) => f.severity === 'error').map((f) => f.code)
}

describe('closure resolution on disk', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devhelm-bundler-'))
    mkdirSync(join(root, '.git'))
  })
  afterEach(() => {
    rmSync(root, {recursive: true, force: true})
  })

  it('follows relative imports with extension and index resolution, JSON and CJS/ESM forms', async () => {
    write('checks/checkout.spec.ts', [
      "import {test} from '@playwright/test'",
      "import {login} from './lib/login'",
      "import data from './fixtures/cart.json'",
      "export * from './lib/reexport'",
      "const helper = require('./lib/helper.cjs')",
      "const lazy = await import('./lib/lazy.js')",
      "import './lib'",
    ].join('\n'))
    write('checks/lib/login.ts', "export const login = 1\n")
    write('checks/lib/reexport.ts', "export const r = 1\n")
    write('checks/lib/helper.cjs', "module.exports = {}\n")
    write('checks/lib/lazy.js', "export default 1\n")
    write('checks/lib/index.ts', "export {}\n")
    write('checks/fixtures/cart.json', '{"items": []}\n')
    write('checks/unused.ts', 'export const unused = 1\n')

    const bundle = await resolveBundle(join(root, 'checks/checkout.spec.ts'), {runtime: RUNTIME, source: false})
    expect(bundle.entrypoint).toBe('checks/checkout.spec.ts')
    expect(bundle.fileList).toEqual([
      'checks/checkout.spec.ts',
      'checks/fixtures/cart.json',
      'checks/lib/helper.cjs',
      'checks/lib/index.ts',
      'checks/lib/lazy.js',
      'checks/lib/login.ts',
      'checks/lib/reexport.ts',
    ])
    expect(bundle.digest).toBe(computeDigestSync(bundle.files))
    expect(bundle.binary).toBe(false)
  })

  it('bundles auth.setup.ts next to the entrypoint, and a named setup file', async () => {
    write('a/check.spec.ts', 'export {}\n')
    write('a/auth.setup.ts', "import './session-helper'\n")
    write('a/session-helper.ts', 'export {}\n')
    write('a/custom.setup.ts', 'export {}\n')
    const auto = await resolveBundle(join(root, 'a/check.spec.ts'), {runtime: RUNTIME, source: false})
    expect(auto.setupFile).toBe('a/auth.setup.ts')
    expect(auto.fileList).toContain('a/session-helper.ts')
    const named = await resolveBundle(join(root, 'a/check.spec.ts'), {runtime: RUNTIME, source: false, setupFile: 'custom.setup.ts'})
    expect(named.setupFile).toBe('a/custom.setup.ts')
    expect(named.fileList).not.toContain('a/auth.setup.ts')
    const missing = await checkBundle(join(root, 'a/check.spec.ts'), {runtime: RUNTIME, source: false, setupFile: 'nope.setup.ts'})
    expect(missing.errors[0]?.rule).toBe('setup_missing')
  })

  it('resolves tsconfig paths and baseUrl through extends, and bundles the tsconfig chain', async () => {
    write('tsconfig.base.json', '{\n  // comment\n  "compilerOptions": {"baseUrl": ".", "paths": {"@lib/*": ["shared/*"],},},\n}\n')
    write('tsconfig.json', '{"extends": "./tsconfig.base.json"}\n')
    write('shared/money.ts', 'export const cents = 1\n')
    write('checks/pay.spec.ts', "import {cents} from '@lib/money'\n")
    const bundle = await resolveBundle(join(root, 'checks/pay.spec.ts'), {runtime: RUNTIME, source: false})
    expect(bundle.fileList).toContain('shared/money.ts')
    expect(bundle.tsconfigFiles).toEqual(['tsconfig.json', 'tsconfig.base.json'])
    expect(bundle.fileList).toContain('tsconfig.json')
  })

  it('refuses a symlinked import', async () => {
    write('real/target.ts', 'export {}\n')
    write('checks/a.spec.ts', "import './linked'\n")
    symlinkSync(join(root, 'real/target.ts'), join(root, 'checks/linked.ts'))
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(result.bundle).toBeNull()
    expect(result.errors[0]?.code).toBe('MONITOR_PACKAGE_PATH_INVALID')
    expect(result.errors[0]?.rule).toBe('symlink')
  })

  it('refuses dotfiles and .env imports', async () => {
    write('checks/a.spec.ts', "import './.env.json'\nimport './.secrets/x'\n")
    write('checks/.env.json', '{}')
    write('checks/.secrets/x.ts', 'export {}')
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(result.errors.map((f) => f.rule)).toEqual(['dotfile', 'dotfile'])
  })

  it('refuses imports outside the set: missing, above the root, node_modules, .devhelmignore', async () => {
    write('checks/a.spec.ts', [
      "import './missing'",
      "import '../../outside'",
      "import '../node_modules/pkg/index.js'",
      "import './ignored/thing'",
    ].join('\n'))
    write('node_modules/pkg/index.js', '')
    write('checks/ignored/thing.ts', '')
    write('.devhelmignore', '# comment\nchecks/ignored/\n')
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(codes(result.findings)).toEqual(['IMPORT_NOT_IN_BUNDLE', 'IMPORT_NOT_IN_BUNDLE', 'IMPORT_NOT_IN_BUNDLE', 'IMPORT_NOT_IN_BUNDLE'])
    const missing = result.errors[0]
    expect(missing).toMatchObject({file: 'checks/a.spec.ts', line: 1, import: './missing', suggestInclude: 'checks/missing'})
    expect(result.errors.map((f) => f.rule)).toEqual([undefined, 'outside_root', 'excluded', 'ignored'])
    await expect(resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})).rejects.toBeInstanceOf(BundleError)
  })

  it('collects every finding in one pass, and BundleError lists them all', async () => {
    write('checks/a.spec.ts', "import './one'\nimport './two'\nimport 'left-pad'\nconst token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'\n")
    const error = await resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BundleError)
    const bundleError = error as BundleError
    expect(bundleError.category).toBe('validation')
    expect(bundleError.exitCode).toBe(4)
    expect(bundleError.code).toBe('IMPORT_NOT_IN_BUNDLE')
    expect(bundleError.errors.map((e) => e.code)).toEqual(['IMPORT_NOT_IN_BUNDLE', 'IMPORT_NOT_IN_BUNDLE', 'IMPORT_NOT_IN_RUNTIME', 'SECRET_LITERAL'])
  })

  it('checks bare imports against the runtime catalog', async () => {
    write('checks/a.spec.ts', [
      "import {test} from '@playwright/test'",
      "import {readFileSync} from 'node:fs'",
      "import {readFile} from 'fs/promises'",
      "import {z} from 'zod'",
      "import axios from 'axios'",
      "import {x} from '@scope/missing/deep'",
    ].join('\n'))
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(result.errors).toHaveLength(2)
    expect(result.errors.map((f) => f.package)).toEqual(['axios', '@scope/missing'])
    expect(result.errors[0]).toMatchObject({code: 'IMPORT_NOT_IN_RUNTIME', runtimeId: 'test-rt', line: 5})
  })

  it('warns once and skips the runtime check when no runtime is given', async () => {
    write('checks/a.spec.ts', "import axios from 'axios'\nimport x from 'other'\n")
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: null, source: false})
    expect(result.errors).toHaveLength(0)
    expect(result.warnings.map((w) => w.code)).toEqual(['RUNTIME_UNCHECKED'])
  })

  it('selects the newest available runtime from the bundled catalog', () => {
    const rt = selectRuntime(RUNTIME_CATALOG)
    expect(rt?.status).toBe('available')
    expect(rt?.platformDefault).toBeUndefined()
    expect(Object.keys(rt?.packages ?? {})).toContain('@playwright/test')
    expect(selectRuntime(RUNTIME_CATALOG, 'no-such-runtime')).toBeUndefined()
  })

  it('prefers the platform default, and otherwise the last available runtime', () => {
    const catalog: RuntimePackages[] = [
      {id: 'current', status: 'deprecated', platformDefault: true},
      {id: 'next', status: 'available'},
    ]
    expect(selectRuntime(catalog)?.id).toBe('current')
    expect(selectRuntime(catalog, 'next')?.id).toBe('next')
    expect(selectRuntime([{id: 'a', status: 'available'}, {id: 'b', status: 'available'}])?.id).toBe('b')
  })

  it('include globs ship files nothing imports, and their own imports', async () => {
    write('checks/a.spec.ts', "import './lib/x'\n")
    write('checks/lib/x.ts', '')
    write('checks/data/users.csv', 'id\n1\n')
    write('checks/data/loader.ts', "import './shape'\n")
    write('checks/data/shape.ts', '')
    write('checks/other.spec.ts', '')
    const ok = await resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false, cwd: root, include: ['checks/data/**']})
    expect(ok.fileList).toEqual(['checks/a.spec.ts', 'checks/data/loader.ts', 'checks/data/shape.ts', 'checks/data/users.csv', 'checks/lib/x.ts'])
    expect(ok.includeOnly).toEqual(['checks/data/loader.ts', 'checks/data/shape.ts', 'checks/data/users.csv'])
    expect(toCreateBundleRequest(ok)).toMatchObject({entrypoint: 'checks/a.spec.ts', include: ['checks/data/loader.ts', 'checks/data/shape.ts', 'checks/data/users.csv']})
  })

  it('enforces the file and byte limits', async () => {
    write('checks/a.spec.ts', "import './b'\n")
    write('checks/b.ts', 'x'.repeat(100))
    const result = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false, limits: {maxFiles: 1, maxBytes: BUNDLE_LIMITS.maxBytes}})
    expect(codes(result.findings)).toEqual(['BUNDLE_TOO_LARGE'])
    const bytes = await checkBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false, limits: {maxFiles: 256, maxBytes: 50}})
    expect(codes(bytes.findings)).toEqual(['BUNDLE_TOO_LARGE'])
  })

  it('uses the nearest .git ancestor as root, else the fallback, else the entry directory', async () => {
    write('nested/deep/a.spec.ts', '')
    const withGit = await resolveBundle(join(root, 'nested/deep/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(withGit.entrypoint).toBe('nested/deep/a.spec.ts')
    rmSync(join(root, '.git'), {recursive: true})
    const noGit = await resolveBundle(join(root, 'nested/deep/a.spec.ts'), {runtime: RUNTIME, source: false, fallbackRoot: join(root, 'nested')})
    expect(noGit.entrypoint).toBe('deep/a.spec.ts')
    const explicit = await resolveBundle('a.spec.ts', {runtime: RUNTIME, source: false, cwd: join(root, 'nested/deep'), root: join(root, 'nested/deep')})
    expect(explicit.entrypoint).toBe('a.spec.ts')
  })

  it('marks a bundle with non-UTF-8 bytes as binary (zip upload)', async () => {
    write('checks/a.spec.ts', "import data from './blob.json'\n")
    write('checks/blob.json', new Uint8Array([0xff, 0xfe, 0x00]))
    const bundle = await resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(bundle.binary).toBe(true)
    expect(bundle.files['checks/blob.json']).toBeInstanceOf(Uint8Array)
    expect(toCreateBundleRequest(bundle)).toBeNull()
  })

  it('fills source from CI env vars', async () => {
    write('checks/a.spec.ts', '')
    const bundle = await resolveBundle(join(root, 'checks/a.spec.ts'), {
      runtime: RUNTIME,
      env: {GITHUB_REPOSITORY: 'acme/web', GITHUB_REF_NAME: 'main', GITHUB_SHA: 'abc123'},
    })
    expect(bundle.source).toMatchObject({repo: 'acme/web', branch: 'main', commit: 'abc123'})
  })

  it('fills source from git when no CI env is set', async () => {
    rmSync(join(root, '.git'), {recursive: true})
    write('checks/a.spec.ts', '')
    try {
      execFileSync('git', ['init', '-q', '-b', 'feature/x'], {cwd: root})
      execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/web.git'], {cwd: root})
      execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x'], {cwd: root})
    } catch {
      return // git unavailable on this machine
    }
    const bundle = await resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, env: {}})
    expect(bundle.source?.repo).toBe('acme/web')
    expect(bundle.source?.branch).toBe('feature/x')
    expect(bundle.source?.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(bundle.source?.file).toBe('checks/a.spec.ts')
  })

  it('builds the CreateBundleRequest JSON body', async () => {
    write('checks/a.spec.ts', "import './b'\n")
    write('checks/b.ts', 'export {}\n')
    const bundle = await resolveBundle(join(root, 'checks/a.spec.ts'), {runtime: RUNTIME, source: false})
    expect(bundle.includeOnly).toEqual([])
    expect(toCreateBundleRequest(bundle, '2026.11')).toEqual({
      files: {'checks/a.spec.ts': "import './b'\n", 'checks/b.ts': 'export {}\n'},
      entrypoint: 'checks/a.spec.ts',
      runtimeId: '2026.11',
    })
  })
})

describe('in-memory code {entrypoint, files}', () => {
  it('resolves the closure and digest without the filesystem', async () => {
    const check = await checkInMemory(
      {entrypoint: './a.spec.ts', files: {'a.spec.ts': "import './b'\n", './b.ts': 'export {}\n', 'unused.ts': ''}},
      {runtime: RUNTIME},
      nodeSha256,
    )
    expect(check.errors).toEqual([])
    expect(check.bundle?.fileList).toEqual(['a.spec.ts', 'b.ts'])
  })

  it('refuses dotfiles and parent paths in the map', async () => {
    const check = await checkInMemory({entrypoint: 'a.spec.ts', files: {'a.spec.ts': '', '.env': 'X=1', '../x.ts': ''}}, {runtime: RUNTIME}, nodeSha256)
    expect(check.errors.map((f) => f.rule)).toEqual(['dotfile', 'parent_segment'])
  })

  it('is accepted by resolveBundle', async () => {
    const bundle = await resolveBundle({entrypoint: 'a.spec.ts', files: {'a.spec.ts': 'export {}\n'}}, {runtime: RUNTIME})
    expect(bundle.root).toBeNull()
    expect(bundle.digest).toBe(computeDigestSync({'a.spec.ts': 'export {}\n'}))
  })
})

describe('literal-secret scan (D-12 rules)', () => {
  const cases: Array<[string, string]> = [
    ['private_key', '-----BEGIN RSA PRIVATE KEY-----'],
    ['vendor_token', "const k = 'sk_live_abc'"],
    ['vendor_token', "const k = 'AKIAABCDEFGHIJKLMNOP'"],
    ['vendor_token', "const k = 'dh_live_123'"],
    ['jwt', "const t = 'eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4f'"],
    ['header_literal', "headers: {Authorization: 'Bearer abcdefgh'}"],
    ['header_literal', "'cookie': 'session=abcdef123'"],
    ['high_entropy_assignment', "const apiKey = 'q8Zr2LmX9vB4nT7wK1pY'"],
  ]
  for (const [rule, line] of cases) {
    it(`finds ${rule}: ${line.slice(0, 32)}`, () => {
      const result = scanSecrets({'a.ts': `ok\n${line}\n`})
      expect(result.findings).toEqual([{code: 'SECRET_LITERAL', file: 'a.ts', line: 2, rule, message: `Literal secret in a.ts:2 (${rule})`}])
      expect(result.findings[0]?.message).not.toContain(line)
    })
  }

  it('ignores low-entropy or non-secret identifiers', () => {
    expect(scanSecrets({'a.ts': "const password = 'aaaaaaaaaaaaaaaaaaaa'\nconst title = 'q8Zr2LmX9vB4nT7wK1pY'\n"}).findings).toEqual([])
    expect(shannonEntropy('aaaa')).toBe(0)
  })

  it('honours // devhelm-allow-literal and lists the line', () => {
    const result = scanSecrets({'a.ts': "const k = 'sk_test_x' // devhelm-allow-literal: Stripe test fixture\n"})
    expect(result.findings).toEqual([])
    expect(result.allowed).toEqual([{file: 'a.ts', line: 1, reason: 'Stripe test fixture'}])
  })

  it('scans only source and config extensions', () => {
    expect(scanSecrets({'README.md': 'sk_live_x'}).findings).toEqual([])
    expect(scanSecrets({'config.yml': 'key: sk_live_x'}).findings).toHaveLength(1)
  })
})

describe('keys, globs, zip, remotes', () => {
  it('lists process.env keys, entrypoint first, first hit wins', () => {
    const keys = scanKeys({'b.ts': 'process.env.B_KEY\nprocess.env.A_KEY', 'a.spec.ts': "process.env['A_KEY']"}, 'a.spec.ts')
    expect(keys).toEqual([{key: 'A_KEY', file: 'a.spec.ts', line: 1}, {key: 'B_KEY', file: 'b.ts', line: 1}])
  })

  it('matches include globs', () => {
    expect(compileGlob('checks/**').test('checks/a/b.ts')).toBe(true)
    expect(compileGlob('checks/**/*.ts').test('checks/a.ts')).toBe(true)
    expect(compileGlob('checks/*.{ts,json}').test('checks/a.json')).toBe(true)
    expect(compileGlob('checks/*.ts').test('checks/a/b.ts')).toBe(false)
  })

  it('applies .devhelmignore rules with negation and directories', () => {
    const m = new IgnoreMatcher('fixtures/\n*.log\n!keep.log\n/top.ts\n')
    expect(m.ignores('fixtures/a.json')).toBe(true)
    expect(m.ignores('deep/fixtures/a.json')).toBe(true)
    expect(m.ignores('x/debug.log')).toBe(true)
    expect(m.ignores('keep.log')).toBe(false)
    expect(m.ignores('top.ts')).toBe(true)
    expect(m.ignores('sub/top.ts')).toBe(false)
  })

  it('writes a zip that standard tools read back byte for byte', () => {
    const files = {'a.spec.ts': 'export {}\n', 'img/logo.png': new Uint8Array([0, 255, 13, 10]), 'café.txt': 'x'}
    const zip = zipBundle(files)
    const dir = mkdtempSync(join(tmpdir(), 'devhelm-zip-'))
    try {
      writeFileSync(join(dir, 'b.zip'), zip)
      let listing: string
      try {
        listing = execFileSync('python3', ['-I', '-c', 'import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({n: list(z.read(n)) for n in z.namelist()}))', join(dir, 'b.zip')], {encoding: 'utf8'})
      } catch {
        return // python3 unavailable
      }
      const read = JSON.parse(listing) as Record<string, number[]>
      expect(Object.keys(read).sort()).toEqual(['a.spec.ts', 'café.txt', 'img/logo.png'])
      expect(read['img/logo.png']).toEqual([0, 255, 13, 10])
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('normalizes git remotes to owner/repo', () => {
    expect(repoFromRemote('git@github.com:acme/web.git')).toBe('acme/web')
    expect(repoFromRemote('https://github.com/acme/web')).toBe('acme/web')
    expect(repoFromRemote('https://gitlab.com/group/sub/proj.git')).toBe('group/sub/proj')
  })
})
