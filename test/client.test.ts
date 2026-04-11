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
})

describe('Devhelm exports', () => {
  it('exports error classes', async () => {
    const {DevhelmError, AuthError} = await import('../src/index.js')
    expect(DevhelmError).toBeDefined()
    expect(AuthError).toBeDefined()
  })

  it('exports type constructors', async () => {
    const {Monitors, Incidents, AlertChannels, Secrets, Tags} = await import('../src/index.js')
    expect(Monitors).toBeDefined()
    expect(Incidents).toBeDefined()
    expect(AlertChannels).toBeDefined()
    expect(Secrets).toBeDefined()
    expect(Tags).toBeDefined()
  })
})
