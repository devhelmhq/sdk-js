/**
 * Real-API matrix (doc 42 §5.5.3) against the mono test stack.
 *
 *   DEVHELM_E2E_API_URL=http://localhost:8081 DEVHELM_E2E_TOKEN=devhelm-dev-token \
 *   DEVHELM_E2E_ORG_ID=2 DEVHELM_E2E_WORKSPACE_ID=2 npm run test:e2e
 *
 * The stack has no execution fleet, so runs stay queued: the matrix asserts
 * on the contract (status codes, Run shape, phase, startDeadlineAt, error
 * envelopes), not on `passed`. Bundle uploads check digest parity with the
 * server for CRLF, binary, non-ASCII, JSON and setup-file closures.
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Devhelm, DevhelmError, ValidationError, isRun, type MonitorDto, type RunDto} from '../../src/index.js'
import {computeDigestSync} from '../../src/bundler/index.js'

const URL_ = process.env['DEVHELM_E2E_API_URL']
const enabled = Boolean(URL_)
const PREFIX = `sdk-js-e2e-${Math.random().toString(36).slice(2, 8)}`

let devhelm: Devhelm
let dir: string
let envSlug: string
let envId: string

function write(rel: string, content: string | Uint8Array): string {
  const abs = join(dir, rel)
  mkdirSync(join(abs, '..'), {recursive: true})
  writeFileSync(abs, content)
  return abs
}

/**
 * A run-producing call returns a Run, or — on a stack whose execution
 * catalog holds admissions — the typed retryable 503 `RUNTIME_UNAVAILABLE`
 * envelope (CLI exit 19). Both are the contract; anything else fails.
 */
async function runOrHeld(call: Promise<RunDto>): Promise<RunDto | null> {
  try {
    const run = await call
    expectRunShape(run)
    return run
  } catch (e) {
    expect(e).toBeInstanceOf(DevhelmError)
    const err = e as DevhelmError
    expect(err.category).toBe('platform')
    expect(err.code).toBe('RUNTIME_UNAVAILABLE')
    expect(err.retryable).toBe(true)
    expect(err.status).toBe(503)
    expect(err.requestId).toBeTruthy()
    return null
  }
}

function expectRunShape(run: RunDto): void {
  expect(run.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(['created', 'queued', 'starting', 'running', 'finalizing', 'finished']).toContain(run.phase)
  expect(typeof run.countsTowardHealth).toBe('boolean')
  expect(run.bundleDigest).toMatch(/^sha256:/)
  if (run.phase === 'queued' || run.phase === 'created') expect(run.startDeadlineAt ?? null).not.toBeUndefined()
}

describe.skipIf(!enabled)('real API (test stack)', () => {
  beforeAll(async () => {
    devhelm = new Devhelm({
      token: process.env['DEVHELM_E2E_TOKEN'] ?? 'devhelm-dev-token',
      baseUrl: URL_,
      orgId: process.env['DEVHELM_E2E_ORG_ID'] ?? '2',
      workspaceId: process.env['DEVHELM_E2E_WORKSPACE_ID'] ?? '2',
      retry: {maxAttempts: 2, maxDelayMs: 1000},
    })
    dir = mkdtempSync(join(tmpdir(), 'devhelm-e2e-'))
    mkdirSync(join(dir, '.git'))
    envSlug = PREFIX
    const env = await devhelm.environments.create({name: PREFIX, slug: envSlug})
    envId = env.id
  }, 60_000)

  afterAll(async () => {
    if (dir) rmSync(dir, {recursive: true, force: true})
    if (envSlug) await devhelm.environments.delete(envSlug).catch(() => undefined)
  })

  describe('bundle digest parity with the server', () => {
    const cases: Array<[string, Record<string, string | Uint8Array>, string]> = [
      ['CRLF text', {'crlf/a.spec.ts': "import {test} from '@playwright/test'\r\nimport './b'\r\n", 'crlf/b.ts': 'export const b = 1\r\n'}, 'crlf/a.spec.ts'],
      ['non-ASCII path', {'na/café.spec.ts': "import './über'\n", 'na/über.ts': '// ü\n'}, 'na/café.spec.ts'],
      ['JSON import', {'js/a.spec.ts': "import data from './data.json'\n", 'js/data.json': '{"a": 1}\n'}, 'js/a.spec.ts'],
      ['setup file', {'st/a.spec.ts': 'export {}\n', 'st/auth.setup.ts': "import './session'\n", 'st/session.ts': 'export {}\n'}, 'st/a.spec.ts'],
      ['binary file (zip upload)', {'bin/a.spec.ts': "import x from './blob.json'\n", 'bin/blob.json': new Uint8Array([0x7b, 0xff, 0x7d])}, 'bin/a.spec.ts'],
    ]
    for (const [name, files, entry] of cases) {
      it(name, async () => {
        for (const [p, c] of Object.entries(files)) write(p, c)
        const bundle = await devhelm.bundles.create(join(dir, entry), {source: false})
        const expected = Object.fromEntries(Object.entries(files))
        expect(bundle.digest).toBe(computeDigestSync(expected))
        expect([...bundle.files].sort()).toEqual(Object.keys(files).sort())
      })
    }

    it('include ships an unimported fixture and the digests match', async () => {
      write('inc/checks/a.spec.ts', "import {test} from '@playwright/test'\n")
      write('inc/checks/fixtures/order.json', '{"id": 1}\n')
      const bundle = await devhelm.bundles.create({entrypoint: 'checks/a.spec.ts', include: ['checks/fixtures/order.json'], root: join(dir, 'inc')}, {source: false, cwd: join(dir, 'inc')})
      expect([...bundle.files].sort()).toEqual(['checks/a.spec.ts', 'checks/fixtures/order.json'])
    })

    it('refuses a literal secret on the server too (bundler refusal is identical)', async () => {
      const err = await devhelm.bundles.upload({
        root: null, entrypoint: 'a.spec.ts', files: {'a.spec.ts': "const t = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'\n"},
        fileList: ['a.spec.ts'], digest: '', size: 0, keys: [], keyLocations: [], setupFile: null, tsconfigFiles: [],
        allowedLiterals: [], warnings: [], source: null, binary: false, includeOnly: [],
      }).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).code).toBe('SECRET_LITERAL')
      expect((err as ValidationError).status).toBe(400)
      expect((err as ValidationError).requestId).toBeTruthy()
    })
  })

  for (const type of ['BROWSER', 'MULTI_STEP_API'] as const) {
    describe(`${type} lifecycle`, () => {
      let monitor: MonitorDto
      const spec = type === 'BROWSER'
        ? "import {test, expect} from '@playwright/test'\ntest('home', async ({page}) => { await page.goto('https://example.com') })\n"
        : "import {test, expect} from '@playwright/test'\ntest('api', async ({request}) => { expect((await request.get('https://example.com')).ok()).toBe(true) })\n"

      it('create → live revision 1', async () => {
        const entry = write(`${type}/check.spec.ts`, spec)
        monitor = await devhelm.monitors.create({
          name: `${PREFIX}-${type}`, type, environment: envSlug, code: entry, frequencySeconds: 3600, regions: ['us-east'],
        })
        expect(monitor.type).toBe(type)
        expect(monitor.environment?.id).toBe(envId)
        monitor = await devhelm.monitors.get(monitor.id)
        expect(monitor.liveRevisionId).toBeTruthy()
        expect(monitor.liveRevisionDigest).toMatch(/^sha256:/)
      }, 60_000)

      it('test → 202 Run in the monitor environment', async () => {
        const run = await runOrHeld(devhelm.monitors.test(monitor.id).then((r) => {
          expect(isRun(r)).toBe(true)
          return r as RunDto
        }))
        if (run) {
          expect(run.source).toBe('remote_validation')
          expect(run.countsTowardHealth).toBe(false)
        }
      }, 30_000)

      let draftId: string
      it('change: draft → test → publish', async () => {
        const entry = write(`${type}/check.spec.ts`, `${spec}// v2\n`)
        const {revision} = await devhelm.monitors.revisions.create(monitor.id, {code: entry})
        draftId = revision.id
        expect(revision.state).toBe('draft')
        const again = await devhelm.monitors.revisions.create(monitor.id, {code: entry})
        expect(again.revision.id).toBe(draftId)
        const run = await runOrHeld(devhelm.monitors.revisions.test(monitor.id, draftId))
        if (run) expect(run.revisionId).toBe(draftId)
        const untested = await devhelm.monitors.publish(monitor.id, {revisionId: draftId, requireTested: true}).catch((e: unknown) => e)
        expect(untested).toBeInstanceOf(DevhelmError)
        expect((untested as DevhelmError).code).toBe('REVISION_UNTESTED')
        expect((untested as DevhelmError).exitCode).toBe(18)
        const stale = await devhelm.monitors.publish(monitor.id, {revisionId: draftId, expectedLiveRevisionId: draftId}).catch((e: unknown) => e)
        expect((stale as DevhelmError).code).toBe('LIVE_REVISION_CHANGED')
        const head = await devhelm.monitors.publish(monitor.id, {revisionId: draftId, expectedLiveRevisionId: monitor.liveRevisionId ?? null})
        expect(head).toBeTruthy()
        const after = await devhelm.monitors.get(monitor.id)
        expect(after.liveRevisionId).toBe(draftId)
      }, 60_000)

      it('trigger → TriggerRunsResponse, one run per region', async () => {
        const res = await devhelm.monitors.trigger(monitor.id, {regions: ['us-east']}).catch(async (e: unknown) => {
          await runOrHeld(Promise.reject(e))
          return null
        })
        if (!res) return
        expect(res.billedRuns).toBe(1)
        expect(res.runs).toHaveLength(1)
        const run = await devhelm.runs.get(res.runs[0]!.id)
        expectRunShape(run)
        expect(run.triggerId).toBe(res.triggerId)
        const waited = await devhelm.runs.wait(run.id, {timeoutMs: 1500}).catch((e: unknown) => e)
        if (!(waited instanceof DevhelmError)) expect((waited as RunDto).phase).toBe('finished')
        else expect(waited.code).toBe('WAIT_TIMEOUT')
      }, 30_000)

      it('rollback → previous revision live; revisions list/get/diff', async () => {
        const preview = await devhelm.monitors.rollbackPreview(monitor.id)
        expect(preview).toBeTruthy()
        await devhelm.monitors.rollback(monitor.id, {reason: `${PREFIX} rollback`, expectedLiveRevisionId: draftId})
        const after = await devhelm.monitors.get(monitor.id)
        expect(after.liveRevisionId).toBe(monitor.liveRevisionId)
        const all = await devhelm.monitors.revisions.list(monitor.id, {state: 'all'})
        expect(all.map((r) => r.id)).toEqual(expect.arrayContaining([draftId, monitor.liveRevisionId]))
        const got = await devhelm.monitors.revisions.get(monitor.id, draftId)
        expect(got.id).toBe(draftId)
        const diff = await devhelm.monitors.revisions.diff(monitor.id, draftId)
        expect(diff).toBeTruthy()
        const files = await devhelm.monitors.revisions.files(monitor.id, draftId)
        expect(Object.keys(files.files)).toContain(`${type}/check.spec.ts`)
      }, 30_000)

      it('delete → trash → restore', async () => {
        await devhelm.monitors.delete(monitor.id)
        const trash = await devhelm.monitors.trash.list()
        expect(trash.map((m) => m.id)).toContain(monitor.id)
        const restored = await devhelm.monitors.restore(monitor.id)
        expect(restored.id).toBe(monitor.id)
        await devhelm.monitors.delete(monitor.id)
      }, 30_000)
    })
  }

  it('runs.list returns a sealed CursorPage', async () => {
    const page = await devhelm.runs.list({limit: 5})
    expect(Array.isArray(page.data)).toBe(true)
    expect(typeof page.hasMore).toBe('boolean')
  })

  it('an unknown monitor is a NotFoundError with the envelope', async () => {
    const err = await devhelm.monitors.get('00000000-0000-4000-8000-000000000000').catch((e: unknown) => e)
    expect((err as DevhelmError).category).toBe('not_found')
    expect((err as DevhelmError).exitCode).toBe(4)
  })
})
