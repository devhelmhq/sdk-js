/**
 * Spec-path parity tests.
 *
 * The SDK uses hardcoded path templates (e.g. `/api/v1/monitors/${id}`) that
 * have no compile-time tie to the OpenAPI spec. `spec-check.yml` already
 * verifies that the spec re-bundles cleanly and that the SDK type-checks
 * against the latest schemas, but it does **not** notice when:
 *
 *  - a path the SDK calls is renamed in the API (e.g. `/v1/monitors` → `/v2/monitors`),
 *  - an HTTP method on an existing path goes away (e.g. POST removed from `/api/v1/incidents/{id}/resolve`).
 *
 * This module asserts that every (METHOD, path-template) tuple the SDK uses
 * exists in the vendored `docs/openapi/monitoring-api.json`. The list below
 * is hand-maintained — when adding a new resource method, add the
 * corresponding entry here so the spec drift is caught at test time rather
 * than at runtime.
 */
import {describe, it, expect, beforeAll} from 'vitest'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPEC_PATH = resolve(__dirname, '..', 'docs', 'openapi', 'monitoring-api.json')

type Spec = {
  paths: Record<string, Record<string, unknown>>
}

let spec: Spec

beforeAll(() => {
  spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8')) as Spec
})

/**
 * Templated paths the SDK calls, alongside the HTTP method(s) it issues.
 * Path placeholders use the OpenAPI `{name}` convention, NOT the JS template
 * `${name}` syntax — that's what we compare against the spec.
 */
const SDK_ENDPOINTS: ReadonlyArray<readonly [method: string, path: string]> = [
  // monitors
  ['get', '/api/v1/monitors'],
  ['post', '/api/v1/monitors'],
  ['get', '/api/v1/monitors/{id}'],
  ['put', '/api/v1/monitors/{id}'],
  ['delete', '/api/v1/monitors/{id}'],
  ['post', '/api/v1/monitors/{id}/pause'],
  ['post', '/api/v1/monitors/{id}/resume'],
  ['post', '/api/v1/monitors/{id}/test'],
  ['get', '/api/v1/monitors/{id}/results'],
  ['get', '/api/v1/monitors/{id}/versions'],

  // incidents
  ['get', '/api/v1/incidents'],
  ['post', '/api/v1/incidents'],
  ['get', '/api/v1/incidents/{id}'],
  ['post', '/api/v1/incidents/{id}/resolve'],

  // alert-channels
  ['get', '/api/v1/alert-channels'],
  ['post', '/api/v1/alert-channels'],
  ['get', '/api/v1/alert-channels/{id}'],
  ['put', '/api/v1/alert-channels/{id}'],
  ['delete', '/api/v1/alert-channels/{id}'],
  ['post', '/api/v1/alert-channels/{id}/test'],

  // notification-policies
  ['get', '/api/v1/notification-policies'],
  ['post', '/api/v1/notification-policies'],
  ['get', '/api/v1/notification-policies/{id}'],
  ['put', '/api/v1/notification-policies/{id}'],
  ['delete', '/api/v1/notification-policies/{id}'],
  ['post', '/api/v1/notification-policies/{id}/test'],

  // environments
  ['get', '/api/v1/environments'],
  ['post', '/api/v1/environments'],
  ['get', '/api/v1/environments/{slug}'],
  ['put', '/api/v1/environments/{slug}'],
  ['delete', '/api/v1/environments/{slug}'],

  // secrets
  ['get', '/api/v1/secrets'],
  ['post', '/api/v1/secrets'],
  ['put', '/api/v1/secrets/{key}'],
  ['delete', '/api/v1/secrets/{key}'],

  // tags
  ['get', '/api/v1/tags'],
  ['post', '/api/v1/tags'],
  ['get', '/api/v1/tags/{id}'],
  ['put', '/api/v1/tags/{id}'],
  ['delete', '/api/v1/tags/{id}'],

  // resource-groups
  ['get', '/api/v1/resource-groups'],
  ['post', '/api/v1/resource-groups'],
  ['get', '/api/v1/resource-groups/{id}'],
  ['put', '/api/v1/resource-groups/{id}'],
  ['delete', '/api/v1/resource-groups/{id}'],
  ['post', '/api/v1/resource-groups/{groupId}/members'],
  ['delete', '/api/v1/resource-groups/{groupId}/members/{memberId}'],

  // webhooks
  ['get', '/api/v1/webhooks'],
  ['post', '/api/v1/webhooks'],
  ['get', '/api/v1/webhooks/{id}'],
  ['put', '/api/v1/webhooks/{id}'],
  ['delete', '/api/v1/webhooks/{id}'],
  ['post', '/api/v1/webhooks/{id}/test'],

  // api-keys
  ['get', '/api/v1/api-keys'],
  ['post', '/api/v1/api-keys'],
  ['delete', '/api/v1/api-keys/{id}'],
  ['post', '/api/v1/api-keys/{id}/revoke'],

  // deploy-lock
  ['get', '/api/v1/deploy/lock'],
  ['post', '/api/v1/deploy/lock'],
  ['delete', '/api/v1/deploy/lock/{lockId}'],
  ['delete', '/api/v1/deploy/lock/force'],

  // service-subscriptions (dependencies)
  ['get', '/api/v1/service-subscriptions'],
  ['get', '/api/v1/service-subscriptions/{id}'],
  ['post', '/api/v1/service-subscriptions/{slug}'],
  ['delete', '/api/v1/service-subscriptions/{subscriptionId}'],
  ['patch', '/api/v1/service-subscriptions/{id}/alert-sensitivity'],

  // services (Status Data catalog)
  ['get', '/api/v1/services'],
  ['get', '/api/v1/services/{slugOrId}'],
  ['get', '/api/v1/services/{slugOrId}/live-status'],
  ['get', '/api/v1/categories'],
  ['get', '/api/v1/services/summary'],
  ['get', '/api/v1/services/{slugOrId}/components'],
  ['get', '/api/v1/services/{slugOrId}/components/{componentId}/uptime'],
  ['get', '/api/v1/services/{slugOrId}/components/uptime'],
  ['get', '/api/v1/services/{slugOrId}/days/{date}'],
  ['get', '/api/v1/services/{slugOrId}/incidents'],
  ['get', '/api/v1/services/incidents'],
  ['get', '/api/v1/services/{slugOrId}/incidents/{incidentId}'],
  ['get', '/api/v1/services/{slugOrId}/uptime'],
  ['get', '/api/v1/services/{slugOrId}/maintenances'],

  // dashboard
  ['get', '/api/v1/dashboard/overview'],

  // maintenance-windows
  ['get', '/api/v1/maintenance-windows'],
  ['post', '/api/v1/maintenance-windows'],
  ['get', '/api/v1/maintenance-windows/{id}'],
  ['put', '/api/v1/maintenance-windows/{id}'],
  ['delete', '/api/v1/maintenance-windows/{id}'],

  // status-pages
  ['get', '/api/v1/status-pages'],
  ['post', '/api/v1/status-pages'],
  ['get', '/api/v1/status-pages/{id}'],
  ['put', '/api/v1/status-pages/{id}'],
  ['delete', '/api/v1/status-pages/{id}'],

  // status-pages > components
  ['get', '/api/v1/status-pages/{pageId}/components'],
  ['post', '/api/v1/status-pages/{pageId}/components'],
  ['put', '/api/v1/status-pages/{pageId}/components/{componentId}'],
  ['delete', '/api/v1/status-pages/{pageId}/components/{componentId}'],
  ['put', '/api/v1/status-pages/{pageId}/components/reorder'],
  ['put', '/api/v1/status-pages/{pageId}/layout/reorder'],

  // status-pages > groups
  ['get', '/api/v1/status-pages/{pageId}/groups'],
  ['post', '/api/v1/status-pages/{pageId}/groups'],
  ['put', '/api/v1/status-pages/{pageId}/groups/{groupId}'],
  ['delete', '/api/v1/status-pages/{pageId}/groups/{groupId}'],

  // status-pages > incidents
  ['get', '/api/v1/status-pages/{pageId}/incidents'],
  ['post', '/api/v1/status-pages/{pageId}/incidents'],
  ['get', '/api/v1/status-pages/{pageId}/incidents/{incidentId}'],
  ['put', '/api/v1/status-pages/{pageId}/incidents/{incidentId}'],
  ['delete', '/api/v1/status-pages/{pageId}/incidents/{incidentId}'],
  ['post', '/api/v1/status-pages/{pageId}/incidents/{incidentId}/updates'],
  ['post', '/api/v1/status-pages/{pageId}/incidents/{incidentId}/publish'],
  ['post', '/api/v1/status-pages/{pageId}/incidents/{incidentId}/dismiss'],

  // status-pages > subscribers
  ['get', '/api/v1/status-pages/{pageId}/subscribers'],
  ['post', '/api/v1/status-pages/{pageId}/subscribers'],
  ['delete', '/api/v1/status-pages/{pageId}/subscribers/{subscriberId}'],

  // status-pages > domains
  ['get', '/api/v1/status-pages/{pageId}/domains'],
  ['post', '/api/v1/status-pages/{pageId}/domains'],
  ['post', '/api/v1/status-pages/{pageId}/domains/{domainId}/verify'],
  ['delete', '/api/v1/status-pages/{pageId}/domains/{domainId}'],
] as const

/**
 * Resolve (method, sdkPath) against the spec, allowing the placeholder
 * names to differ between the SDK and the spec (e.g. `{id}` vs `{groupId}`).
 * Match is by structural shape: same number of segments, identical literal
 * segments, and matching positions for `{...}` placeholders.
 */
function findMatchingSpecPath(method: string, sdkPath: string, spec: Spec): {path: string; method: string} | null {
  const sdkSegments = sdkPath.split('/')
  let methodlessMatch: {path: string; method: string} | null = null
  for (const specPath of Object.keys(spec.paths)) {
    const specSegments = specPath.split('/')
    if (specSegments.length !== sdkSegments.length) continue
    let matches = true
    for (let i = 0; i < sdkSegments.length; i++) {
      const a = sdkSegments[i]
      const b = specSegments[i]
      const aIsParam = a.startsWith('{') && a.endsWith('}')
      const bIsParam = b.startsWith('{') && b.endsWith('}')
      if (aIsParam && bIsParam) continue
      if (a !== b) {
        matches = false
        break
      }
    }
    if (!matches) continue
    const ops = spec.paths[specPath]
    if (Object.prototype.hasOwnProperty.call(ops, method)) {
      return {path: specPath, method}
    }
    if (methodlessMatch === null) {
      methodlessMatch = {path: specPath, method: ''}
    }
  }
  return methodlessMatch
}

describe('SDK paths exist in OpenAPI spec', () => {
  it.each(SDK_ENDPOINTS)('%s %s is documented in the spec', (method, sdkPath) => {
    const match = findMatchingSpecPath(method, sdkPath, spec)
    expect(match, `No spec path matches ${sdkPath} (any method)`).not.toBeNull()
    expect(
      match!.method,
      `Spec path ${match!.path} exists but does not declare ${method.toUpperCase()}; rename the SDK call or add the method upstream`,
    ).toBe(method)
  })
})
