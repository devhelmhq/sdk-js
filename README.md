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

// Get a single monitor
const fetched = await client.monitors.get(monitor.id)

// Pause / resume
await client.monitors.pause(monitor.id)
await client.monitors.resume(monitor.id)

// Delete
await client.monitors.delete(monitor.id)
```

## Configuration

```ts
import {Devhelm} from '@devhelm/sdk'

const client = new Devhelm({
  token: 'your-api-token',           // required (or DEVHELM_API_TOKEN env var)
  orgId: '1',                        // optional (or DEVHELM_ORG_ID; defaults to '1')
  workspaceId: '1',                  // optional (or DEVHELM_WORKSPACE_ID; defaults to '1')
  baseUrl: 'https://api.devhelm.io', // optional, defaults to production
})
```

Environment variables are used as fallbacks when constructor arguments are not provided:

| Parameter     | Env Variable           |
| ------------- | ---------------------- |
| `token`       | `DEVHELM_API_TOKEN`    |
| `orgId`       | `DEVHELM_ORG_ID`       |
| `workspaceId` | `DEVHELM_WORKSPACE_ID` |

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

The SDK raises three top-level error types:

- `DevhelmValidationError` — local request/response shape validation failed.
- `DevhelmApiError` — the API returned a non-2xx status. Subclassed by HTTP class for ergonomics:
  - `DevhelmAuthError` (401/403)
  - `DevhelmNotFoundError` (404)
  - `DevhelmConflictError` (409)
  - `DevhelmRateLimitError` (429)
  - `DevhelmServerError` (5xx)
- `DevhelmTransportError` — the request never reached a server response (connection refused, timeout, TLS failure, etc.).

Every `DevhelmApiError` carries:

- `status` — the HTTP status code
- `code` — coarse machine-readable category (e.g. `NOT_FOUND`, `RATE_LIMITED`); switch on this, not the human-readable `message`
- `requestId` — the per-request id from the `X-Request-Id` response header; always include this in support tickets

```ts
import {Devhelm, DevhelmAuthError, DevhelmError} from '@devhelm/sdk'

const client = new Devhelm({token: 'bad-token', orgId: '1', workspaceId: '1'})

try {
  await client.monitors.list()
} catch (e) {
  if (e instanceof DevhelmAuthError) {
    console.log(`Auth failed: ${e.message} (HTTP ${e.status}, requestId=${e.requestId})`)
  } else if (e instanceof DevhelmError) {
    console.log(`API error [${e.code}]: ${e.message}`)
  } else {
    throw e
  }
}
```

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
- Browser bundlers (Vite, Webpack, esbuild, Rollup) — works with the same ESM build
- Cloudflare Workers — works (uses native `fetch`)

The client sends `X-DevHelm-Surface: sdk-js` and `X-DevHelm-Surface-Version: <package version>` on every request so the API can attribute traffic and warn you if your version is end-of-life. See [Surface Support Policy](https://devhelm.io/surfaces/support).

## License

MIT
