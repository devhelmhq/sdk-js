#!/usr/bin/env node
/**
 * Thin test harness invoked by monorepo pytest surface tests.
 *
 * Usage: node test/run-sdk.mjs <resource> <action> [args...] --token=<t> --api-url=<u>
 *
 * Prints JSON to stdout on success, exits non-zero with error JSON on failure.
 * This mirrors the CLI's `--output json` behavior so pytest tests can parse results uniformly.
 */
import {Devhelm} from '../dist/index.js'

const argv = process.argv.slice(2)

function extractFlag(name) {
  const prefix = `--${name}=`
  const idx = argv.findIndex(a => a.startsWith(prefix))
  if (idx === -1) return undefined
  const val = argv[idx].slice(prefix.length)
  argv.splice(idx, 1)
  return val
}

const token = extractFlag('token') || process.env.DEVHELM_API_TOKEN || 'devhelm-dev-token'
const apiUrl = extractFlag('api-url') || process.env.TEST_API_URL || 'http://localhost:8081'
const orgId = extractFlag('org-id') || process.env.DEVHELM_ORG_ID || '1'
const workspaceId = extractFlag('workspace-id') || process.env.DEVHELM_WORKSPACE_ID || '1'

const client = new Devhelm({token, baseUrl: apiUrl, orgId, workspaceId})
const [resource, action, ...rest] = argv

async function run() {
  switch (`${resource}.${action}`) {
    // ── Monitors ──
    case 'monitors.list': return client.monitors.list()
    case 'monitors.get': return client.monitors.get(rest[0])
    case 'monitors.create': return client.monitors.create(JSON.parse(rest[0]))
    case 'monitors.update': return client.monitors.update(rest[0], JSON.parse(rest[1]))
    case 'monitors.delete': return void await client.monitors.delete(rest[0])
    case 'monitors.pause': return client.monitors.pause(rest[0])
    case 'monitors.resume': return client.monitors.resume(rest[0])
    case 'monitors.test': return client.monitors.test(rest[0])
    case 'monitors.results': return client.monitors.results(rest[0], rest[1] ? JSON.parse(rest[1]) : {})
    case 'monitors.versions': return client.monitors.versions(rest[0], rest[1] ? JSON.parse(rest[1]) : {})

    // ── Incidents ──
    case 'incidents.list': return client.incidents.list()
    case 'incidents.get': return client.incidents.get(rest[0])
    case 'incidents.create': return client.incidents.create(JSON.parse(rest[0]))
    case 'incidents.resolve': return client.incidents.resolve(rest[0], rest[1] ? {body: rest[1]} : undefined)
    // NOTE: incidents have no DELETE endpoint by design (resolve is terminal).
    // See `docs/openapi/monitoring-api.json` — only GET/POST exist on the
    // incidents collection and item paths.

    // ── Alert Channels ──
    case 'alert-channels.list': return client.alertChannels.list()
    case 'alert-channels.get': return client.alertChannels.get(rest[0])
    case 'alert-channels.create': return client.alertChannels.create(JSON.parse(rest[0]))
    case 'alert-channels.update': return client.alertChannels.update(rest[0], JSON.parse(rest[1]))
    case 'alert-channels.delete': return void await client.alertChannels.delete(rest[0])
    case 'alert-channels.test': return client.alertChannels.test(rest[0])

    // ── Notification Policies ──
    case 'notification-policies.list': return client.notificationPolicies.list()
    case 'notification-policies.get': return client.notificationPolicies.get(rest[0])
    case 'notification-policies.create': return client.notificationPolicies.create(JSON.parse(rest[0]))
    case 'notification-policies.update': return client.notificationPolicies.update(rest[0], JSON.parse(rest[1]))
    case 'notification-policies.delete': return void await client.notificationPolicies.delete(rest[0])
    case 'notification-policies.test': return void await client.notificationPolicies.test(rest[0])

    // ── Environments ──
    case 'environments.list': return client.environments.list()
    case 'environments.get': return client.environments.get(rest[0])
    case 'environments.create': return client.environments.create(JSON.parse(rest[0]))
    case 'environments.update': return client.environments.update(rest[0], JSON.parse(rest[1]))
    case 'environments.delete': return void await client.environments.delete(rest[0])

    // ── Secrets ──
    case 'secrets.list': return client.secrets.list()
    case 'secrets.create': return client.secrets.create(JSON.parse(rest[0]))
    case 'secrets.update': return client.secrets.update(rest[0], JSON.parse(rest[1]))
    case 'secrets.delete': return void await client.secrets.delete(rest[0])

    // ── Tags ──
    case 'tags.list': return client.tags.list()
    case 'tags.get': return client.tags.get(rest[0])
    case 'tags.create': return client.tags.create(JSON.parse(rest[0]))
    case 'tags.update': return client.tags.update(rest[0], JSON.parse(rest[1]))
    case 'tags.delete': return void await client.tags.delete(rest[0])

    // ── Resource Groups ──
    case 'resource-groups.list': return client.resourceGroups.list()
    case 'resource-groups.get': return client.resourceGroups.get(rest[0])
    case 'resource-groups.create': return client.resourceGroups.create(JSON.parse(rest[0]))
    case 'resource-groups.update': return client.resourceGroups.update(rest[0], JSON.parse(rest[1]))
    case 'resource-groups.delete': return void await client.resourceGroups.delete(rest[0])
    case 'resource-groups.add-member': return void await client.resourceGroups.addMember(rest[0], {memberId: rest[1], memberType: rest[2]})
    case 'resource-groups.remove-member': return void await client.resourceGroups.removeMember(rest[0], rest[1])

    // ── Webhooks ──
    case 'webhooks.list': return client.webhooks.list()
    case 'webhooks.get': return client.webhooks.get(rest[0])
    case 'webhooks.create': return client.webhooks.create(JSON.parse(rest[0]))
    case 'webhooks.update': return client.webhooks.update(rest[0], JSON.parse(rest[1]))
    case 'webhooks.delete': return void await client.webhooks.delete(rest[0])
    case 'webhooks.test': return client.webhooks.test(rest[0])

    // ── API Keys ──
    case 'api-keys.list': return client.apiKeys.list()
    case 'api-keys.create': return client.apiKeys.create(JSON.parse(rest[0]))
    case 'api-keys.revoke': return void await client.apiKeys.revoke(rest[0])
    case 'api-keys.delete': return void await client.apiKeys.delete(rest[0])

    // ── Dependencies ──
    case 'dependencies.list': return client.dependencies.list()
    case 'dependencies.get': return client.dependencies.get(rest[0])
    case 'dependencies.track': return client.dependencies.track(rest[0])
    case 'dependencies.delete': return void await client.dependencies.delete(rest[0])

    // ── Deploy Lock ──
    case 'deploy-lock.acquire': return client.deployLock.acquire(JSON.parse(rest[0]))
    case 'deploy-lock.current': return client.deployLock.current()
    case 'deploy-lock.release': return void await client.deployLock.release(rest[0])
    case 'deploy-lock.force-release': return void await client.deployLock.forceRelease()

    // ── Status ──
    case 'status.overview': return client.status.overview()

    // ── Status Pages ──
    case 'status-pages.list': return client.statusPages.list()
    case 'status-pages.get': return client.statusPages.get(rest[0])
    case 'status-pages.create': return client.statusPages.create(JSON.parse(rest[0]))
    case 'status-pages.update': return client.statusPages.update(rest[0], JSON.parse(rest[1]))
    case 'status-pages.delete': return void await client.statusPages.delete(rest[0])
    case 'status-pages.reorder-layout': return void await client.statusPages.reorderLayout(rest[0], JSON.parse(rest[1]))

    // ── Status Page Components ──
    case 'status-pages.components.list': return client.statusPages.components.list(rest[0])
    case 'status-pages.components.create': return client.statusPages.components.create(rest[0], JSON.parse(rest[1]))
    case 'status-pages.components.update': return client.statusPages.components.update(rest[0], rest[1], JSON.parse(rest[2]))
    case 'status-pages.components.delete': return void await client.statusPages.components.delete(rest[0], rest[1])
    case 'status-pages.components.reorder': return void await client.statusPages.components.reorder(rest[0], JSON.parse(rest[1]))

    // ── Status Page Groups ──
    case 'status-pages.groups.list': return client.statusPages.groups.list(rest[0])
    case 'status-pages.groups.create': return client.statusPages.groups.create(rest[0], JSON.parse(rest[1]))
    case 'status-pages.groups.update': return client.statusPages.groups.update(rest[0], rest[1], JSON.parse(rest[2]))
    case 'status-pages.groups.delete': return void await client.statusPages.groups.delete(rest[0], rest[1])

    // ── Status Page Incidents ──
    case 'status-pages.incidents.list': {
      const opts = rest[1] ? JSON.parse(rest[1]) : undefined
      return client.statusPages.incidents.list(rest[0], opts)
    }
    case 'status-pages.incidents.get': return client.statusPages.incidents.get(rest[0], rest[1])
    case 'status-pages.incidents.create': return client.statusPages.incidents.create(rest[0], JSON.parse(rest[1]))
    case 'status-pages.incidents.update': return client.statusPages.incidents.update(rest[0], rest[1], JSON.parse(rest[2]))
    case 'status-pages.incidents.post-update': return client.statusPages.incidents.postUpdate(rest[0], rest[1], JSON.parse(rest[2]))
    case 'status-pages.incidents.publish': return client.statusPages.incidents.publish(rest[0], rest[1], rest[2] ? JSON.parse(rest[2]) : undefined)
    case 'status-pages.incidents.dismiss': return void await client.statusPages.incidents.dismiss(rest[0], rest[1])
    case 'status-pages.incidents.delete': return void await client.statusPages.incidents.delete(rest[0], rest[1])

    // ── Status Page Subscribers ──
    case 'status-pages.subscribers.list': {
      const opts = rest[1] ? JSON.parse(rest[1]) : undefined
      return client.statusPages.subscribers.list(rest[0], opts)
    }
    case 'status-pages.subscribers.add': return client.statusPages.subscribers.add(rest[0], JSON.parse(rest[1]))
    case 'status-pages.subscribers.remove': return void await client.statusPages.subscribers.remove(rest[0], rest[1])

    // ── Status Page Domains ──
    case 'status-pages.domains.list': return client.statusPages.domains.list(rest[0])
    case 'status-pages.domains.add': return client.statusPages.domains.add(rest[0], JSON.parse(rest[1]))
    case 'status-pages.domains.verify': return client.statusPages.domains.verify(rest[0], rest[1])
    case 'status-pages.domains.remove': return void await client.statusPages.domains.remove(rest[0], rest[1])

    default:
      process.stderr.write(JSON.stringify({error: `Unknown operation: ${resource}.${action}`}))
      process.exit(2)
  }
}

try {
  const result = await run()
  if (result !== undefined) {
    process.stdout.write(JSON.stringify(result))
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  const code = err?.code ?? 'UNKNOWN'
  const status = err?.status ?? 0
  process.stderr.write(JSON.stringify({error: msg, code, status}))
  process.exit(1)
}
