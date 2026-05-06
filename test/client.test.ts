import {describe, it, expect} from 'vitest'
import {Devhelm} from '../src/index.js'

describe('Devhelm client', () => {
  const client = new Devhelm({token: 'test-token', baseUrl: 'http://localhost:8080'})

  it('exposes all resource modules', () => {
    expect(client.monitors).toBeDefined()
    expect(client.incidents).toBeDefined()
    expect(client.alertChannels).toBeDefined()
    expect(client.notificationPolicies).toBeDefined()
    expect(client.environments).toBeDefined()
    expect(client.secrets).toBeDefined()
    expect(client.tags).toBeDefined()
    expect(client.resourceGroups).toBeDefined()
    expect(client.webhooks).toBeDefined()
    expect(client.apiKeys).toBeDefined()
    expect(client.dependencies).toBeDefined()
    expect(client.deployLock).toBeDefined()
    expect(client.status).toBeDefined()
    expect(client.statusPages).toBeDefined()
    expect(client.maintenanceWindows).toBeDefined()
  })

  it('resource modules have expected CRUD methods', () => {
    expect(typeof client.monitors.list).toBe('function')
    expect(typeof client.monitors.get).toBe('function')
    expect(typeof client.monitors.create).toBe('function')
    expect(typeof client.monitors.update).toBe('function')
    expect(typeof client.monitors.delete).toBe('function')
  })

  it('monitors have custom action methods', () => {
    expect(typeof client.monitors.pause).toBe('function')
    expect(typeof client.monitors.resume).toBe('function')
    expect(typeof client.monitors.test).toBe('function')
    expect(typeof client.monitors.results).toBe('function')
    expect(typeof client.monitors.versions).toBe('function')
  })

  it('alert channels have test method', () => {
    expect(typeof client.alertChannels.test).toBe('function')
  })

  it('secrets use key-based operations', () => {
    expect(typeof client.secrets.list).toBe('function')
    expect(typeof client.secrets.create).toBe('function')
    expect(typeof client.secrets.update).toBe('function')
    expect(typeof client.secrets.delete).toBe('function')
  })

  it('deploy lock has acquire/release/forceRelease', () => {
    expect(typeof client.deployLock.acquire).toBe('function')
    expect(typeof client.deployLock.release).toBe('function')
    expect(typeof client.deployLock.forceRelease).toBe('function')
    expect(typeof client.deployLock.current).toBe('function')
  })

  it('api keys have revoke method', () => {
    expect(typeof client.apiKeys.revoke).toBe('function')
  })

  it('dependencies have track method', () => {
    expect(typeof client.dependencies.track).toBe('function')
  })

  it('statusPages have CRUD methods', () => {
    expect(typeof client.statusPages.list).toBe('function')
    expect(typeof client.statusPages.get).toBe('function')
    expect(typeof client.statusPages.create).toBe('function')
    expect(typeof client.statusPages.update).toBe('function')
    expect(typeof client.statusPages.delete).toBe('function')
    expect(typeof client.statusPages.reorderLayout).toBe('function')
  })

  it('statusPages expose sub-resource accessors', () => {
    expect(client.statusPages.components).toBeDefined()
    expect(client.statusPages.groups).toBeDefined()
    expect(client.statusPages.incidents).toBeDefined()
    expect(client.statusPages.subscribers).toBeDefined()
    expect(client.statusPages.domains).toBeDefined()
  })

  it('statusPages.components have CRUD + reorder methods', () => {
    const c = client.statusPages.components
    expect(typeof c.list).toBe('function')
    expect(typeof c.create).toBe('function')
    expect(typeof c.update).toBe('function')
    expect(typeof c.delete).toBe('function')
    expect(typeof c.reorder).toBe('function')
  })

  it('statusPages.groups have CRUD methods', () => {
    const g = client.statusPages.groups
    expect(typeof g.list).toBe('function')
    expect(typeof g.create).toBe('function')
    expect(typeof g.update).toBe('function')
    expect(typeof g.delete).toBe('function')
  })

  it('statusPages.incidents have full lifecycle methods', () => {
    const i = client.statusPages.incidents
    expect(typeof i.list).toBe('function')
    expect(typeof i.get).toBe('function')
    expect(typeof i.create).toBe('function')
    expect(typeof i.update).toBe('function')
    expect(typeof i.postUpdate).toBe('function')
    expect(typeof i.publish).toBe('function')
    expect(typeof i.dismiss).toBe('function')
    expect(typeof i.delete).toBe('function')
  })

  it('statusPages.subscribers have add/list/remove methods', () => {
    const s = client.statusPages.subscribers
    expect(typeof s.list).toBe('function')
    expect(typeof s.add).toBe('function')
    expect(typeof s.remove).toBe('function')
  })

  it('statusPages.domains have add/list/verify/remove methods', () => {
    const d = client.statusPages.domains
    expect(typeof d.list).toBe('function')
    expect(typeof d.add).toBe('function')
    expect(typeof d.verify).toBe('function')
    expect(typeof d.remove).toBe('function')
  })
})

describe('Devhelm exports', () => {
  it('exports error classes', async () => {
    const {
      DevhelmError,
      DevhelmApiError,
      DevhelmAuthError,
      DevhelmNotFoundError,
      DevhelmConflictError,
      DevhelmRateLimitError,
      DevhelmServerError,
      DevhelmTransportError,
      DevhelmValidationError,
    } = await import('../src/index.js')
    expect(DevhelmError).toBeDefined()
    expect(DevhelmApiError).toBeDefined()
    expect(DevhelmAuthError).toBeDefined()
    expect(DevhelmNotFoundError).toBeDefined()
    expect(DevhelmConflictError).toBeDefined()
    expect(DevhelmRateLimitError).toBeDefined()
    expect(DevhelmServerError).toBeDefined()
    expect(DevhelmTransportError).toBeDefined()
    expect(DevhelmValidationError).toBeDefined()
  })

  it('exports type constructors', async () => {
    const {Monitors, Incidents, AlertChannels, Secrets, Tags, StatusPages} = await import('../src/index.js')
    expect(Monitors).toBeDefined()
    expect(Incidents).toBeDefined()
    expect(AlertChannels).toBeDefined()
    expect(Secrets).toBeDefined()
    expect(Tags).toBeDefined()
    expect(StatusPages).toBeDefined()
  })
})
