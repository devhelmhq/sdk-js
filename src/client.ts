import type {DevhelmConfig} from './types.js'
import {buildClient} from './http.js'
import {Monitors} from './resources/monitors.js'
import {Incidents} from './resources/incidents.js'
import {Forensics} from './resources/forensics.js'
import {AlertChannels} from './resources/alert-channels.js'
import {NotificationPolicies} from './resources/notification-policies.js'
import {Environments} from './resources/environments.js'
import {Secrets} from './resources/secrets.js'
import {Tags} from './resources/tags.js'
import {ResourceGroups} from './resources/resource-groups.js'
import {Webhooks} from './resources/webhooks.js'
import {ApiKeys} from './resources/api-keys.js'
import {Dependencies} from './resources/dependencies.js'
import {DeployLock} from './resources/deploy-lock.js'
import {Status} from './resources/status.js'
import {StatusPages} from './resources/status-pages.js'
import {MaintenanceWindows} from './resources/maintenance-windows.js'

/**
 * DevHelm API client.
 *
 * @example
 * ```ts
 * import {Devhelm} from '@devhelm/sdk'
 *
 * const client = new Devhelm({token: 'your-api-token'})
 *
 * const monitors = await client.monitors.list()
 * const monitor = await client.monitors.create({
 *   name: 'My API',
 *   type: 'HTTP',
 *   config: {url: 'https://api.example.com/health', method: 'GET'},
 *   frequencySeconds: 60,
 * })
 * ```
 */
export class Devhelm {
  readonly monitors: Monitors
  readonly incidents: Incidents
  readonly forensics: Forensics
  readonly alertChannels: AlertChannels
  readonly notificationPolicies: NotificationPolicies
  readonly environments: Environments
  readonly secrets: Secrets
  readonly tags: Tags
  readonly resourceGroups: ResourceGroups
  readonly webhooks: Webhooks
  readonly apiKeys: ApiKeys
  readonly dependencies: Dependencies
  readonly deployLock: DeployLock
  readonly status: Status
  readonly statusPages: StatusPages
  readonly maintenanceWindows: MaintenanceWindows

  constructor(config: DevhelmConfig) {
    const client = buildClient(config)
    this.monitors = new Monitors(client)
    this.incidents = new Incidents(client)
    this.forensics = new Forensics(client)
    this.alertChannels = new AlertChannels(client)
    this.notificationPolicies = new NotificationPolicies(client)
    this.environments = new Environments(client)
    this.secrets = new Secrets(client)
    this.tags = new Tags(client)
    this.resourceGroups = new ResourceGroups(client)
    this.webhooks = new Webhooks(client)
    this.apiKeys = new ApiKeys(client)
    this.dependencies = new Dependencies(client)
    this.deployLock = new DeployLock(client)
    this.status = new Status(client)
    this.statusPages = new StatusPages(client)
    this.maintenanceWindows = new MaintenanceWindows(client)
  }
}
