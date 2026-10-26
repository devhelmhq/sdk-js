import type {DevhelmConfig} from './types.js'
import {Transport, resolveConfig, type ApiClient, type Platform, type ResolvedConfig} from './http.js'
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
import {Inboxes} from './resources/inboxes.js'
import {Email} from './resources/email.js'
import {ApiKeys} from './resources/api-keys.js'
import {Dependencies} from './resources/dependencies.js'
import {Services} from './resources/services.js'
import {DeployLock} from './resources/deploy-lock.js'
import {Status} from './resources/status.js'
import {StatusPages} from './resources/status-pages.js'
import {MaintenanceWindows} from './resources/maintenance-windows.js'
import {Runs} from './resources/runs.js'
import {Bundles, type CodeResolver} from './resources/bundles.js'
import {Runtimes} from './resources/runtimes.js'
import {Account, Audit} from './resources/account.js'

/**
 * The DevHelm client, independent of where it runs. `Devhelm` from
 * `@devhelm/sdk` (Node) and from `@devhelm/sdk/web` (browsers) extend it with
 * their platform: env vars and the CLI context, and how `code` is read.
 */
export class DevhelmClient {
  readonly monitors: Monitors
  readonly runs: Runs
  readonly bundles: Bundles
  readonly runtimes: Runtimes
  readonly account: Account
  readonly audit: Audit
  readonly incidents: Incidents
  readonly forensics: Forensics
  readonly alertChannels: AlertChannels
  readonly notificationPolicies: NotificationPolicies
  readonly environments: Environments
  readonly secrets: Secrets
  readonly tags: Tags
  readonly resourceGroups: ResourceGroups
  readonly webhooks: Webhooks
  readonly inboxes: Inboxes
  readonly email: Email
  readonly apiKeys: ApiKeys
  readonly dependencies: Dependencies
  readonly services: Services
  readonly deployLock: DeployLock
  readonly status: Status
  readonly statusPages: StatusPages
  readonly maintenanceWindows: MaintenanceWindows

  /** Resolved token source, base URL, org / workspace and client headers. */
  readonly config: Readonly<Omit<ResolvedConfig, 'token' | 'headers' | 'fetch' | 'idempotencyKey'>>
  /** The underlying openapi-fetch client (typed against the generated `paths`). */
  readonly api: ApiClient
  readonly #transport: Transport

  protected constructor(config: DevhelmConfig, platform: Platform, resolver: CodeResolver) {
    const resolved = resolveConfig(config, platform)
    const transport = new Transport(resolved)
    this.#transport = transport
    const client = transport.api
    this.api = client
    this.config = {
      tokenSource: resolved.tokenSource,
      baseUrl: resolved.baseUrl,
      orgId: resolved.orgId,
      workspaceId: resolved.workspaceId,
      client: resolved.client,
      maxAttempts: resolved.maxAttempts,
      maxRetryDelayMs: resolved.maxRetryDelayMs,
    }
    this.environments = new Environments(client)
    this.bundles = new Bundles(client, resolver)
    this.monitors = new Monitors(client, {bundles: this.bundles, environments: this.environments})
    this.runs = new Runs(client)
    this.runtimes = new Runtimes(client)
    this.account = new Account(client)
    this.audit = new Audit(client)
    this.incidents = new Incidents(client)
    this.forensics = new Forensics(client)
    this.alertChannels = new AlertChannels(client)
    this.notificationPolicies = new NotificationPolicies(client)
    this.secrets = new Secrets(client, this.environments)
    this.tags = new Tags(client)
    this.resourceGroups = new ResourceGroups(client)
    this.webhooks = new Webhooks(client)
    this.inboxes = new Inboxes(client)
    this.email = new Email(client)
    this.apiKeys = new ApiKeys(client)
    this.dependencies = new Dependencies(client)
    this.services = new Services(client)
    this.deployLock = new DeployLock(client)
    this.status = new Status(client)
    this.statusPages = new StatusPages(client)
    this.maintenanceWindows = new MaintenanceWindows(client)
  }
  /**
   * Send a prepared request through this client's transport: an
   * `Idempotency-Key` on POST (from `idempotencyKey`, else a UUID), and the
   * retry policy (429, 503, retryable 409, `Retry-After`). Non-2xx
   * responses are returned, not thrown. For wrappers that keep their own
   * typed client (the CLI) and need the same wire behaviour.
   */
  send(request: Request): Promise<Response> {
    return this.#transport.send(request)
  }

}
