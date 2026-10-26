# DevHelm JavaScript / TypeScript SDK

Typed JavaScript / TypeScript client for the [DevHelm](https://devhelm.io) monitoring API — monitors, incidents, alerting, and more. Works in Node.js 18+ and modern bundlers; ships with full TypeScript types.

## Installation

```bash
npm install @devhelm/sdk
```

## Quick Start

```ts
import {Devhelm} from '@devhelm/sdk'

const client = new Devhelm({
  token: 'your-api-token',
  orgId: 'your-org-id',
  workspaceId: 'your-workspace-id',
})

// List all monitors
const monitors = await client.monitors.list()
for (const m of monitors) {
  console.log(`${m.name} — ${m.type}`)
}

// Create a monitor
const monitor = await client.monitors.create({
  name: 'My API Health',
  type: 'HTTP',
  config: {url: 'https://api.example.com/health', method: 'GET'},
  frequencySeconds: 60,
  regions: ['us-east'],
  // `managedBy` records who reconciles drift. `DASHBOARD` (default) means
  // "no reconciliation" — the right answer for one-off scripts and most
  // SDK use. Use `CLI` if this monitor lives in a `devhelm.yml` you
  // re-deploy, or `TERRAFORM` if it lives in `.tf` you re-apply.
  managedBy: 'DASHBOARD',
})
// Note: `monitor.currentStatus` is null until the first probe runs (~1 minute); display `monitor.currentStatus ?? 'PENDING'`.

// Get a single monitor
const fetched = await client.monitors.get(monitor.id)

// Pause / resume
await client.monitors.pause(monitor.id)
await client.monitors.resume(monitor.id)

// Delete
await client.monitors.delete(monitor.id)
```

## Code checks (browser and multi-step API)

Point `code` at a file. The SDK resolves the import closure, refuses symlinks, dotfiles and imports outside the bundle, scans for literal secrets, uploads the closure and checks that the API computed the same digest.

```ts
import {Devhelm} from '@devhelm/sdk'
const devhelm = new Devhelm({token: process.env.DEVHELM_API_TOKEN})

// Validate a file before any monitor exists (billed, never alerts)
const tried = await devhelm.monitors.testAdhoc({type: 'BROWSER', environment: 'staging', code: './checkout.spec.ts'}, {wait: true})

// Create: revision 1 goes live in this call, and the monitor runs at create
const m = await devhelm.monitors.create({name: 'Checkout', type: 'BROWSER', environment: 'production',
                                          code: './checkout.spec.ts', frequencySeconds: 600, regions: ['us-east']})

// Change: draft → test → publish
const {revision} = await devhelm.monitors.revisions.create(m.id, {code: './checkout.spec.ts'})
const t = await devhelm.monitors.revisions.test(m.id, revision.id, {wait: true})
if (t.outcome === 'passed') await devhelm.monitors.publish(m.id, {revisionId: revision.id, expectedLiveRevisionId: m.liveRevisionId})

// Recorded runs in several regions; never alerts unless {signal: true}
const {runs} = await devhelm.monitors.trigger(m.id, {regions: ['us-east', 'eu-west'], wait: true})
```

`code` takes a path, `{entrypoint, include}` or `{entrypoint, files}`. The bundle root is the nearest ancestor with `.git`, else the entrypoint's directory (`root` overrides it). `auth.setup.ts` next to the entrypoint is always bundled.

`wait` uses the run's event stream, then polling. It returns the finished run whatever its outcome, and throws only `WaitTimeoutError {runId, phase}` (default 5 minutes). It never cancels the run. Use `devhelm.runs.wait(id)` for a run you already have.

`monitors.probe(id)` runs the uptime probe once. `monitors.test(id)` queues a validation run for a code monitor. On an uptime monitor, `monitors.test(id)` still returns the probe result until 2027-01-31, with a deprecation warning; after that it throws `ValidationError` `USE_PROBE`.

### Entry points

| Import | For |
| --- | --- |
| `@devhelm/sdk` | Node.js. Reads `code` from disk, `DEVHELM_API_TOKEN` and the `devhelm auth login` context |
| `@devhelm/sdk/web` | Browsers and other runtimes without a filesystem. `code` is `{entrypoint, files}` only; pass `token` |
| `@devhelm/sdk/bundler` | The bundler on its own: `resolveBundle`, `checkBundle`, `computeDigest`, `scanSecrets`, `toCreateBundleRequest`, `zipBundle`, `RUNTIME_CATALOG` |

## Inbound testing

`inboxes` captures HTTP. `email` captures mail. `webhooks` is still outbound alert delivery.

```ts
const inbox = await client.inboxes.create({name: 'stripe'})
// point the other product at inbox.httpUrl
const event = await inbox.wait({timeoutMs: 30_000, http: {method: 'POST'}})
const payment = event.json()
const raw = await event.raw()

const to = await client.email.address({label: 'signup'})
const message = await to.wait({timeoutMs: 60_000, subjectContains: 'code'})
const code = message.otp?.[0]?.value
const file = await message.attachments?.[0]?.file()
```

`wait` throws `DevhelmApiError` with `code === 'WAIT_TIMEOUT'` when nothing arrives. `json()` parses the captured body. `raw()` and `file()` download a short-lived signed URL.

## Configuration

```ts
import {Devhelm} from '@devhelm/sdk'

const client = new Devhelm({
  token: 'your-api-token',           // or DEVHELM_API_TOKEN, or the `devhelm auth login` context
  orgId: '1',                        // optional (or DEVHELM_ORG_ID; defaults to '1')
  workspaceId: '1',                  // optional (or DEVHELM_WORKSPACE_ID; omit when the org has one workspace)
  baseUrl: 'https://api.devhelm.io', // optional (or DEVHELM_API_URL)
})
```

| Parameter     | Fallbacks, in order                                    |
| ------------- | ------------------------------------------------------ |
| `token`       | `DEVHELM_API_TOKEN`, then the CLI context              |
| `baseUrl`     | `DEVHELM_API_URL`, then the CLI context, then production |
| `orgId`       | `DEVHELM_ORG_ID`                                       |
| `workspaceId` | `DEVHELM_WORKSPACE_ID`                                 |

No token anywhere throws `ValidationError` with code `NO_TOKEN`.

Every call sends `X-DevHelm-Client: sdk-js/<version>` (wrappers pass `client: 'cli/1.30.0'`). Every POST carries an `Idempotency-Key`: one UUID per call, reused only when the SDK retries that call. The SDK retries 429, 503 and retryable 409s (`DEPLOY_LOCKED`) up to 5 times, honouring `Retry-After` (`retry: {maxAttempts, maxDelayMs}`).

## Resources

The client exposes the following resource modules:

| Resource                       | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| `client.monitors`              | HTTP, DNS, TCP, ICMP, MCP, and Heartbeat monitors          |
| `client.incidents`             | Manual and auto-detected incidents                         |
| `client.forensics`             | Per-monitor rule evaluations, transitions, and policy snapshots |
| `client.alertChannels`         | Slack, email, webhook, and other alert channels            |
| `client.notificationPolicies`  | Routing rules for alerts                                   |
| `client.environments`          | Environment grouping (prod, staging, etc.)                 |
| `client.secrets`               | Encrypted secrets for monitor auth                         |
| `client.tags`                  | Organize monitors with tags                                |
| `client.resourceGroups`        | Logical resource groups                                    |
| `client.webhooks`              | Outgoing webhook endpoints                                 |
| `client.apiKeys`               | API key management                                         |
| `client.dependencies`          | Service dependency tracking                                |
| `client.services`              | Status Data catalog (third-party service status, incidents, uptime) |
| `client.deployLock`            | Deploy lock for safe deployments                           |
| `client.statusPages`           | Public status page management                              |
| `client.status`                | Dashboard overview                                         |

## Pagination

List methods auto-paginate by default. For manual page control:

```ts
// Auto-paginate (fetches all pages)
const allMonitors = await client.monitors.list()

// Manual page control
const page = await client.monitors.listPage(0, 20)
console.log(page.data)     // array of monitors
console.log(page.hasNext)  // true if more pages
console.log(page.hasPrev)  // true if previous page exists

// Cursor pagination (for check results)
const results = await client.monitors.results(monitorId, {limit: 50})
console.log(results.data)
console.log(results.nextCursor)
console.log(results.hasMore)
```

## Error Handling

Every error is a `DevhelmError`. The class follows the API's `category`, not the HTTP status:

| `category` | Class | CLI exit |
| --- | --- | --- |
| `validation` | `ValidationError` | 4 |
| `blocked` | `BlockedError` | 4 |
| `not_found` | `NotFoundError` | 4 |
| `auth` | `AuthError` | 17 |
| `permission` | `PermissionError` | 17 |
| `ownership` | `OwnershipError` | 17 |
| `plan` | `PlanLimitError` | 16 |
| `quota` | `QuotaError` | 16 |
| `confirmation_required` | `ConfirmationRequiredError` | 15 |
| `conflict` | `ConflictError` | 18 |
| `gone` | `GoneError` | 20 |
| `rate_limit` | `RateLimitError` | 11 |
| `platform` | `PlatformError` | 11 |
| `transport` | `TransportError` | 12 |

`runs.wait()` adds `WaitTimeoutError` (exit 19). Each error carries every `ErrorResponse` field (`code`, `requestId`, `retryable`, `errors[]`, `next`, `details`, `used`, `limit`, `resetsAt`, …) and `exitCode`.

```ts
import {Devhelm, QuotaError, DevhelmError} from '@devhelm/sdk'

try {
  await devhelm.monitors.trigger(id, {regions: ['us-east']})
} catch (e) {
  if (e instanceof QuotaError) console.log(`${e.used}/${e.limit} runs used; resumes ${e.resetsAt}`)
  else if (e instanceof DevhelmError) console.log(`[${e.category}] ${e.code}: ${e.message} (${e.requestId})`)
  else throw e
}
```

The 1.11 names (`DevhelmApiError`, `DevhelmAuthError`, `DevhelmNotFoundError`, `DevhelmConflictError`, `DevhelmRateLimitError`, `DevhelmServerError`, `DevhelmValidationError`, `DevhelmTransportError`) still work for `instanceof` until 2027-01-31.

## TypeScript

All resource methods return strongly-typed responses. DTOs are re-exported from the package root:

```ts
import {
  Devhelm,
  type MonitorDto,
  type IncidentDto,
  type CreateMonitorRequest,
} from '@devhelm/sdk'

const client = new Devhelm({token: process.env.DEVHELM_API_TOKEN!})
const monitors: MonitorDto[] = await client.monitors.list()
```

Strict-mode TypeScript and ESM are first-class — the package ships ESM-only with named `exports` map.

## Compatibility

- Node.js ≥ 18 (uses native `fetch`)
- Browsers, Cloudflare Workers and other runtimes: import `@devhelm/sdk/web`

The client sends `X-DevHelm-Surface: sdk-js` and `X-DevHelm-Surface-Version: <package version>` on every request so the API can attribute traffic and warn you if your version is end-of-life. See [Surface Support Policy](https://devhelm.io/surfaces/support).

## License

MIT
