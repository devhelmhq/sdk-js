import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {schemas} from '../src/schemas.js'
import {DevhelmError} from '../src/errors.js'
import {parse, parseSingle, parsePage, parseCursorPage} from '../src/validation.js'

// ── Helpers ─────────────────────────────────────────────────────────

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const UUID2 = '550e8400-e29b-41d4-a716-446655440001'
const ISO = '2024-01-01T00:00:00Z'
const fail = (s: z.ZodTypeAny, v: unknown) => expect(s.safeParse(v).success).toBe(false)
const pass = (s: z.ZodTypeAny, v: unknown) => expect(s.safeParse(v).success).toBe(true)

// ── Valid fixtures ──────────────────────────────────────────────────

const validHttpConfig = {monitorType: 'HTTP', url: 'https://example.com', method: 'GET'}
const validSlackConfig = {channelType: 'slack', webhookUrl: 'https://hooks.slack.com/xxx', mentionText: null}
const validBranding = {
  logoUrl: null, faviconUrl: null, brandColor: null, pageBackground: null,
  cardBackground: null, textColor: null, borderColor: null, headerStyle: null,
  theme: null, reportUrl: null, hidePoweredBy: false, customCss: null, customHeadHtml: null,
}

const validMonitorDto = {
  id: UUID, organizationId: 1, name: 'Test Monitor',
  type: 'HTTP', config: validHttpConfig, frequencySeconds: 60,
  enabled: true, regions: ['us-east-1'], managedBy: 'DASHBOARD',
  createdAt: ISO, updatedAt: ISO,
}

const validIncidentDto = {
  id: UUID, organizationId: 1,
  source: 'MANUAL', status: 'TRIGGERED', severity: 'DOWN',
  affectedRegions: [], reopenCount: 0, statusPageVisible: false,
  createdAt: ISO, updatedAt: ISO,
}

const validAlertChannelDto = {
  id: UUID, name: 'Slack alerts', channelType: 'slack',
  createdAt: ISO, updatedAt: ISO,
}

const validNotificationPolicyDto = {
  id: UUID, organizationId: 1, name: 'Default',
  matchRules: [{type: 'all'}],
  escalation: {steps: [{delayMinutes: 0, channelIds: [UUID]}]},
  enabled: true, priority: 0, createdAt: ISO, updatedAt: ISO,
}

const validEnvironmentDto = {
  id: UUID, orgId: 1, name: 'Production', slug: 'production',
  variables: {}, createdAt: ISO, updatedAt: ISO, monitorCount: 0, isDefault: false,
}

const validSecretDto = {
  id: UUID, key: 'MY_SECRET', dekVersion: 1, valueHash: 'abc123',
  createdAt: ISO, updatedAt: ISO,
}

const validTagDto = {
  id: UUID, organizationId: 1, name: 'critical', color: '#FF0000',
  createdAt: ISO, updatedAt: ISO,
}

const validResourceGroupDto = {
  id: UUID, organizationId: 1, name: 'API Services', slug: 'api-services',
  suppressMemberAlerts: false,
  health: {status: 'operational', totalMembers: 0, operationalCount: 0, activeIncidents: 0},
  createdAt: ISO, updatedAt: ISO,
}

const validWebhookEndpointDto = {
  id: UUID, url: 'https://example.com/hook',
  subscribedEvents: ['monitor.created'], enabled: true,
  consecutiveFailures: 0, createdAt: ISO, updatedAt: ISO,
}

const validApiKeyDto = {
  id: 1, name: 'My Key', key: 'dh_xxxx',
  createdAt: ISO, updatedAt: ISO,
}

const validDeployLockDto = {
  id: UUID, lockedBy: 'ci-pipeline', lockedAt: ISO, expiresAt: ISO,
}

const validDashboardOverviewDto = {
  monitors: {total: 10, up: 8, down: 1, degraded: 1, paused: 0},
  incidents: {active: 1, resolvedToday: 2},
}

const validCheckResultDto = {
  id: UUID, timestamp: ISO, region: 'us-east-1', passed: true,
}

const validMonitorVersionDto = {
  id: UUID, monitorId: UUID, version: 1, snapshot: validMonitorDto,
  changedVia: 'API', createdAt: ISO,
}

const validStatusPageDto = {
  id: UUID, organizationId: 1, workspaceId: 1,
  name: 'Status', slug: 'status', branding: validBranding,
  visibility: 'PUBLIC', enabled: true, incidentMode: 'MANUAL',
  createdAt: ISO, updatedAt: ISO,
}

const validStatusPageComponentDto = {
  id: UUID, statusPageId: UUID2, name: 'API',
  type: 'STATIC', currentStatus: 'OPERATIONAL',
  showUptime: true, displayOrder: 0, pageOrder: 0,
  excludeFromOverall: false, createdAt: ISO, updatedAt: ISO,
}

const validStatusPageComponentGroupDto = {
  id: UUID, statusPageId: UUID2, name: 'Infrastructure',
  displayOrder: 0, pageOrder: 0, collapsed: false,
  createdAt: ISO, updatedAt: ISO,
}

const validStatusPageIncidentDto = {
  id: UUID, statusPageId: UUID2, title: 'Outage',
  status: 'INVESTIGATING', impact: 'MAJOR', body: 'text',
  scheduled: false, autoResolve: false,
  startedAt: ISO, createdAt: ISO, updatedAt: ISO,
}

const validStatusPageSubscriberDto = {
  id: UUID, email: 'user@example.com', confirmed: true, createdAt: ISO,
}

const validStatusPageCustomDomainDto = {
  id: UUID, hostname: 'status.example.com',
  status: 'ACTIVE', verificationMethod: 'CNAME',
  verificationToken: 'abc', verificationCnameTarget: 'verify.devhelm.io',
  createdAt: ISO, updatedAt: ISO, primary: true,
}

const validStatusPageIncidentUpdateDto = {
  id: UUID, status: 'INVESTIGATING', body: 'Working on it',
  notifySubscribers: true, createdAt: ISO,
}

const validServiceSubscriptionDto = {
  subscriptionId: UUID, serviceId: UUID2, slug: 'aws', name: 'AWS',
  adapterType: 'statuspage', pollingIntervalSeconds: 300,
  enabled: true, alertSensitivity: 'ALL', subscribedAt: ISO,
}

// =====================================================================
// 1. MonitorDto
// =====================================================================

describe('MonitorDto negative validation', () => {
  const s = schemas.MonitorDto

  it('accepts valid MonitorDto', () => pass(s, validMonitorDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for id (number)', () => fail(s, {...validMonitorDto, id: 123}))
  it('rejects non-UUID id', () => fail(s, {...validMonitorDto, id: 'not-a-uuid'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () => fail(s, {...validMonitorDto, name: 42}))
  it('rejects empty name', () => fail(s, {...validMonitorDto, name: ''}))

  it('rejects missing type', () => {
    const {type: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects invalid type enum', () => fail(s, {...validMonitorDto, type: 'WEBSOCKET'}))
  it('rejects lowercase type enum', () => fail(s, {...validMonitorDto, type: 'http'}))

  it('rejects missing config', () => {
    const {config: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong config type (string)', () => fail(s, {...validMonitorDto, config: 'bad'}))
  it('rejects wrong config type (number)', () => fail(s, {...validMonitorDto, config: 42}))

  it('rejects missing frequencySeconds', () => {
    const {frequencySeconds: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for frequencySeconds (string)', () =>
    fail(s, {...validMonitorDto, frequencySeconds: 'sixty'}))

  it('rejects missing enabled', () => {
    const {enabled: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...validMonitorDto, enabled: 'yes'}))

  it('rejects missing regions', () => {
    const {regions: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for regions (string)', () =>
    fail(s, {...validMonitorDto, regions: 'us-east-1'}))

  it('rejects missing managedBy', () => {
    const {managedBy: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects invalid managedBy enum', () =>
    fail(s, {...validMonitorDto, managedBy: 'GITHUB_ACTIONS'}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for createdAt (number)', () =>
    fail(s, {...validMonitorDto, createdAt: 12345}))

  it('rejects non-datetime createdAt', () =>
    fail(s, {...validMonitorDto, createdAt: 'yesterday'}))

  it('rejects missing organizationId', () => {
    const {organizationId: _, ...rest} = validMonitorDto
    fail(s, rest)
  })

  it('rejects wrong type for organizationId (string)', () =>
    fail(s, {...validMonitorDto, organizationId: 'one'}))

  it('rejects null for non-nullable id', () =>
    fail(s, {...validMonitorDto, id: null}))

  it('rejects null for non-nullable name', () =>
    fail(s, {...validMonitorDto, name: null}))

  it('rejects null for non-nullable type', () =>
    fail(s, {...validMonitorDto, type: null}))

  it('rejects null for non-nullable enabled', () =>
    fail(s, {...validMonitorDto, enabled: null}))

  it('rejects null for non-nullable frequencySeconds', () =>
    fail(s, {...validMonitorDto, frequencySeconds: null}))
})

// =====================================================================
// 2. CreateMonitorRequest
// =====================================================================

describe('CreateMonitorRequest negative validation', () => {
  const s = schemas.CreateMonitorRequest
  const valid = {
    name: 'My Monitor', type: 'HTTP', config: validHttpConfig,
    managedBy: 'DASHBOARD',
  }

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => {
    const {name: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () => fail(s, {...valid, name: 123}))
  it('rejects name longer than 255 chars', () => fail(s, {...valid, name: 'x'.repeat(256)}))

  it('rejects missing type', () => {
    const {type: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects invalid type enum', () => fail(s, {...valid, type: 'GRPC'}))
  it('rejects lowercase type enum', () => fail(s, {...valid, type: 'http'}))

  it('rejects missing config', () => {
    const {config: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong config type (string)', () => fail(s, {...valid, config: 'https://example.com'}))
  it('rejects wrong config type (array)', () => fail(s, {...valid, config: []}))

  it('rejects missing managedBy', () => {
    const {managedBy: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects invalid managedBy enum', () => fail(s, {...valid, managedBy: 'PULUMI'}))

  it('rejects wrong type for frequencySeconds (string)', () =>
    fail(s, {...valid, frequencySeconds: 'fast'}))

  it('rejects non-integer frequencySeconds (float)', () =>
    fail(s, {...valid, frequencySeconds: 30.5}))

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...valid, enabled: 'yes'}))

  it('rejects wrong type for regions (string)', () =>
    fail(s, {...valid, regions: 'us-east-1'}))

  it('rejects non-UUID environmentId', () =>
    fail(s, {...valid, environmentId: 'prod'}))

  it('rejects non-UUID alertChannelIds items', () =>
    fail(s, {...valid, alertChannelIds: ['not-uuid']}))

  it('rejects wrong type for alertChannelIds (string)', () =>
    fail(s, {...valid, alertChannelIds: UUID}))
})

// =====================================================================
// 3. UpdateMonitorRequest
// =====================================================================

describe('UpdateMonitorRequest negative validation', () => {
  const s = schemas.UpdateMonitorRequest

  it('accepts empty object (all fields optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for frequencySeconds', () => pass(s, {frequencySeconds: null}))
  it('accepts null for enabled', () => pass(s, {enabled: null}))
  it('accepts null for regions', () => pass(s, {regions: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 123}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))
  it('rejects wrong type for frequencySeconds (string)', () => fail(s, {frequencySeconds: 'fast'}))
  it('rejects non-integer frequencySeconds', () => fail(s, {frequencySeconds: 30.5}))
  it('rejects wrong type for enabled (string)', () => fail(s, {enabled: 'yes'}))
  it('rejects wrong type for regions (string)', () => fail(s, {regions: 'us-east'}))
  it('rejects invalid managedBy enum', () => fail(s, {managedBy: 'PULUMI'}))
  it('rejects non-UUID environmentId', () => fail(s, {environmentId: 'staging'}))
  it('rejects non-UUID alertChannelIds items', () => fail(s, {alertChannelIds: ['bad-id']}))
  it('rejects wrong type for clearAuth (string)', () => fail(s, {clearAuth: 'yes'}))
})

// =====================================================================
// 4. IncidentDto
// =====================================================================

describe('IncidentDto negative validation', () => {
  const s = schemas.IncidentDto

  it('accepts valid IncidentDto', () => pass(s, validIncidentDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for id (number)', () => fail(s, {...validIncidentDto, id: 123}))
  it('rejects non-UUID id', () => fail(s, {...validIncidentDto, id: 'abc'}))

  it('rejects missing source', () => {
    const {source: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects invalid source enum', () => fail(s, {...validIncidentDto, source: 'WEBHOOK'}))

  it('rejects missing status', () => {
    const {status: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects invalid status enum', () => fail(s, {...validIncidentDto, status: 'OPEN'}))
  it('rejects lowercase status enum', () => fail(s, {...validIncidentDto, status: 'triggered'}))

  it('rejects missing severity', () => {
    const {severity: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects invalid severity enum', () => fail(s, {...validIncidentDto, severity: 'CRITICAL'}))

  it('rejects missing affectedRegions', () => {
    const {affectedRegions: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for affectedRegions (string)', () =>
    fail(s, {...validIncidentDto, affectedRegions: 'us-east'}))

  it('rejects missing reopenCount', () => {
    const {reopenCount: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for reopenCount (string)', () =>
    fail(s, {...validIncidentDto, reopenCount: 'zero'}))

  it('rejects missing organizationId', () => {
    const {organizationId: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for organizationId (string)', () =>
    fail(s, {...validIncidentDto, organizationId: 'org1'}))

  it('rejects missing statusPageVisible', () => {
    const {statusPageVisible: _, ...rest} = validIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for statusPageVisible (string)', () =>
    fail(s, {...validIncidentDto, statusPageVisible: 'yes'}))

  it('rejects non-datetime createdAt', () =>
    fail(s, {...validIncidentDto, createdAt: 'last-week'}))

  it('rejects null for non-nullable id', () =>
    fail(s, {...validIncidentDto, id: null}))

  it('rejects null for non-nullable status', () =>
    fail(s, {...validIncidentDto, status: null}))

  it('rejects null for non-nullable severity', () =>
    fail(s, {...validIncidentDto, severity: null}))

  it('rejects invalid resolutionReason enum', () =>
    fail(s, {...validIncidentDto, resolutionReason: 'TIMEOUT'}))

  it('rejects non-UUID monitorId', () =>
    fail(s, {...validIncidentDto, monitorId: 'mon-123'}))

  it('rejects non-UUID serviceIncidentId', () =>
    fail(s, {...validIncidentDto, serviceIncidentId: 'si-abc'}))
})

// =====================================================================
// 5. CreateManualIncidentRequest
// =====================================================================

describe('CreateManualIncidentRequest negative validation', () => {
  const s = schemas.CreateManualIncidentRequest
  const valid = {title: 'Outage', severity: 'DOWN'}

  it('accepts valid request', () => pass(s, valid))
  it('accepts with optional monitorId', () => pass(s, {...valid, monitorId: UUID}))

  it('rejects missing title', () => fail(s, {severity: 'DOWN'}))
  it('rejects empty title', () => fail(s, {title: '', severity: 'DOWN'}))
  it('rejects wrong type for title (number)', () => fail(s, {title: 42, severity: 'DOWN'}))

  it('rejects missing severity', () => fail(s, {title: 'Outage'}))
  it('rejects invalid severity enum', () => fail(s, {title: 'Outage', severity: 'CRITICAL'}))
  it('rejects lowercase severity', () => fail(s, {title: 'Outage', severity: 'down'}))

  it('rejects non-UUID monitorId', () => fail(s, {...valid, monitorId: 'mon-123'}))
  it('rejects wrong type for monitorId (number)', () => fail(s, {...valid, monitorId: 123}))

  it('rejects wrong type for body (number)', () => fail(s, {...valid, body: 42}))
  it('rejects wrong type for body (boolean)', () => fail(s, {...valid, body: true}))
})

// =====================================================================
// 6. AlertChannelDto
// =====================================================================

describe('AlertChannelDto negative validation', () => {
  const s = schemas.AlertChannelDto

  it('accepts valid AlertChannelDto', () => pass(s, validAlertChannelDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validAlertChannelDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validAlertChannelDto, id: 'ch-123'}))
  it('rejects wrong type for id (number)', () => fail(s, {...validAlertChannelDto, id: 1}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validAlertChannelDto
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () => fail(s, {...validAlertChannelDto, name: 42}))

  it('rejects missing channelType', () => {
    const {channelType: _, ...rest} = validAlertChannelDto
    fail(s, rest)
  })

  it('rejects invalid channelType enum', () => fail(s, {...validAlertChannelDto, channelType: 'sms'}))
  it('rejects uppercase channelType', () => fail(s, {...validAlertChannelDto, channelType: 'SLACK'}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = validAlertChannelDto
    fail(s, rest)
  })

  it('rejects non-datetime createdAt', () => fail(s, {...validAlertChannelDto, createdAt: 'today'}))

  it('rejects missing updatedAt', () => {
    const {updatedAt: _, ...rest} = validAlertChannelDto
    fail(s, rest)
  })

  it('rejects null for non-nullable id', () => fail(s, {...validAlertChannelDto, id: null}))
  it('rejects null for non-nullable name', () => fail(s, {...validAlertChannelDto, name: null}))
  it('rejects null for non-nullable channelType', () => fail(s, {...validAlertChannelDto, channelType: null}))

  it('validates all valid channelType enum values', () => {
    for (const ct of ['email', 'webhook', 'slack', 'pagerduty', 'opsgenie', 'teams', 'discord']) {
      pass(s, {...validAlertChannelDto, channelType: ct})
    }
  })
})

// =====================================================================
// 7. CreateAlertChannelRequest
// =====================================================================

describe('CreateAlertChannelRequest negative validation', () => {
  const s = schemas.CreateAlertChannelRequest
  const valid = {name: 'Slack Channel', config: validSlackConfig}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => {
    const {name: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () => fail(s, {...valid, name: 123}))
  it('rejects name longer than 255 chars', () => fail(s, {...valid, name: 'x'.repeat(256)}))

  it('rejects missing config', () => {
    const {config: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong config type (string)', () => fail(s, {name: 'x', config: 'slack://hook'}))
  it('rejects wrong config type (number)', () => fail(s, {name: 'x', config: 42}))
  it('rejects wrong config type (array)', () => fail(s, {name: 'x', config: []}))
  it('rejects wrong config type (null)', () => fail(s, {name: 'x', config: null}))

  it('rejects config missing webhookUrl for slack', () =>
    fail(s, {name: 'x', config: {channelType: 'slack'}}))

  it('rejects config with empty webhookUrl for slack', () =>
    fail(s, {name: 'x', config: {channelType: 'slack', webhookUrl: ''}}))
})

// =====================================================================
// 8. UpdateAlertChannelRequest
// =====================================================================

describe('UpdateAlertChannelRequest negative validation', () => {
  const s = schemas.UpdateAlertChannelRequest

  it('rejects missing name', () => fail(s, {config: validSlackConfig}))
  it('rejects missing config', () => fail(s, {name: 'Updated'}))

  it('rejects wrong type for name (number)', () =>
    fail(s, {name: 123, config: validSlackConfig}))

  it('rejects name longer than 255 chars', () =>
    fail(s, {name: 'x'.repeat(256), config: validSlackConfig}))

  it('rejects wrong config type (string)', () => fail(s, {name: 'x', config: 'bad'}))
  it('rejects null config', () => fail(s, {name: 'x', config: null}))
})

// =====================================================================
// 9. NotificationPolicyDto
// =====================================================================

describe('NotificationPolicyDto negative validation', () => {
  const s = schemas.NotificationPolicyDto

  it('accepts valid NotificationPolicyDto', () => pass(s, validNotificationPolicyDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validNotificationPolicyDto, id: 'np-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validNotificationPolicyDto, name: ''}))
  it('rejects wrong type for name (number)', () => fail(s, {...validNotificationPolicyDto, name: 42}))

  it('rejects missing matchRules', () => {
    const {matchRules: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects wrong type for matchRules (string)', () =>
    fail(s, {...validNotificationPolicyDto, matchRules: 'all'}))

  it('rejects missing escalation', () => {
    const {escalation: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects wrong type for escalation (string)', () =>
    fail(s, {...validNotificationPolicyDto, escalation: 'default'}))

  it('rejects escalation with empty steps array', () =>
    fail(s, {...validNotificationPolicyDto, escalation: {steps: []}}))

  it('rejects escalation step with missing channelIds', () =>
    fail(s, {...validNotificationPolicyDto, escalation: {steps: [{delayMinutes: 0}]}}))

  it('rejects escalation step with empty channelIds', () =>
    fail(s, {...validNotificationPolicyDto, escalation: {steps: [{delayMinutes: 0, channelIds: []}]}}))

  it('rejects escalation step with non-UUID channelIds', () =>
    fail(s, {...validNotificationPolicyDto, escalation: {steps: [{delayMinutes: 0, channelIds: ['bad']}]}}))

  it('rejects escalation step with negative delayMinutes', () =>
    fail(s, {...validNotificationPolicyDto, escalation: {steps: [{delayMinutes: -1, channelIds: [UUID]}]}}))

  it('rejects missing enabled', () => {
    const {enabled: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...validNotificationPolicyDto, enabled: 'yes'}))

  it('rejects missing priority', () => {
    const {priority: _, ...rest} = validNotificationPolicyDto
    fail(s, rest)
  })

  it('rejects wrong type for priority (string)', () =>
    fail(s, {...validNotificationPolicyDto, priority: 'high'}))

  it('rejects null for non-nullable id', () => fail(s, {...validNotificationPolicyDto, id: null}))
  it('rejects null for non-nullable enabled', () => fail(s, {...validNotificationPolicyDto, enabled: null}))
})

// =====================================================================
// 10. CreateNotificationPolicyRequest
// =====================================================================

describe('CreateNotificationPolicyRequest negative validation', () => {
  const s = schemas.CreateNotificationPolicyRequest
  const valid = {
    name: 'Policy', matchRules: [{type: 'all'}],
    escalation: {steps: [{delayMinutes: 0, channelIds: [UUID]}]},
  }

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => {
    const {name: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () => fail(s, {...valid, name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {...valid, name: 'x'.repeat(256)}))

  it('accepts missing matchRules (catch-all policy)', () => {
    const {matchRules: _, ...rest} = valid
    pass(s, rest)
  })

  it('rejects wrong type for matchRules (string)', () => fail(s, {...valid, matchRules: 'all'}))
  it('rejects wrong type for matchRules (object)', () => fail(s, {...valid, matchRules: {type: 'all'}}))

  it('rejects missing escalation', () => {
    const {escalation: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong type for escalation (string)', () => fail(s, {...valid, escalation: 'default'}))
  it('rejects escalation with empty steps', () => fail(s, {...valid, escalation: {steps: []}}))

  it('rejects wrong type for enabled (string)', () => fail(s, {...valid, enabled: 'yes'}))
  it('rejects wrong type for priority (string)', () => fail(s, {...valid, priority: 'high'}))
  it('rejects non-integer priority', () => fail(s, {...valid, priority: 1.5}))
})

// =====================================================================
// 11. UpdateNotificationPolicyRequest
// =====================================================================

describe('UpdateNotificationPolicyRequest negative validation', () => {
  const s = schemas.UpdateNotificationPolicyRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for matchRules', () => pass(s, {matchRules: null}))
  it('accepts null for escalation', () => pass(s, {escalation: null}))
  it('accepts null for enabled', () => pass(s, {enabled: null}))
  it('accepts null for priority', () => pass(s, {priority: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))
  it('rejects wrong type for matchRules (string)', () => fail(s, {matchRules: 'all'}))
  it('rejects wrong type for escalation (string)', () => fail(s, {escalation: 'auto'}))
  it('rejects wrong type for enabled (string)', () => fail(s, {enabled: 'yes'}))
  it('rejects wrong type for priority (string)', () => fail(s, {priority: 'low'}))
  it('rejects non-integer priority', () => fail(s, {priority: 1.5}))
})

// =====================================================================
// 12. EnvironmentDto
// =====================================================================

describe('EnvironmentDto negative validation', () => {
  const s = schemas.EnvironmentDto

  it('accepts valid EnvironmentDto', () => pass(s, validEnvironmentDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validEnvironmentDto, id: 'env-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validEnvironmentDto, name: ''}))
  it('rejects wrong type for name (number)', () => fail(s, {...validEnvironmentDto, name: 42}))

  it('rejects missing slug', () => {
    const {slug: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects empty slug', () => fail(s, {...validEnvironmentDto, slug: ''}))

  it('rejects missing orgId', () => {
    const {orgId: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects wrong type for orgId (string)', () => fail(s, {...validEnvironmentDto, orgId: 'one'}))

  it('rejects missing variables', () => {
    const {variables: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects wrong type for variables (string)', () =>
    fail(s, {...validEnvironmentDto, variables: 'FOO=bar'}))

  it('rejects wrong type for variables (array)', () =>
    fail(s, {...validEnvironmentDto, variables: ['FOO=bar']}))

  it('rejects missing monitorCount', () => {
    const {monitorCount: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects wrong type for monitorCount (string)', () =>
    fail(s, {...validEnvironmentDto, monitorCount: 'zero'}))

  it('rejects missing isDefault', () => {
    const {isDefault: _, ...rest} = validEnvironmentDto
    fail(s, rest)
  })

  it('rejects wrong type for isDefault (string)', () =>
    fail(s, {...validEnvironmentDto, isDefault: 'yes'}))

  it('rejects null for non-nullable id', () => fail(s, {...validEnvironmentDto, id: null}))
  it('rejects null for non-nullable name', () => fail(s, {...validEnvironmentDto, name: null}))
})

// =====================================================================
// 13. CreateEnvironmentRequest / UpdateEnvironmentRequest
// =====================================================================

describe('CreateEnvironmentRequest negative validation', () => {
  const s = schemas.CreateEnvironmentRequest
  const valid = {name: 'Staging', slug: 'staging', isDefault: false}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => fail(s, {slug: 'staging', isDefault: false}))
  it('rejects wrong type for name (number)', () => fail(s, {...valid, name: 123}))
  it('rejects name longer than 100 chars', () => fail(s, {...valid, name: 'x'.repeat(101)}))

  it('rejects missing slug', () => fail(s, {name: 'Staging', isDefault: false}))
  it('rejects slug with uppercase', () => fail(s, {...valid, slug: 'Staging'}))
  it('rejects slug with special chars', () => fail(s, {...valid, slug: 'staging!'}))
  it('rejects slug starting with hyphen', () => fail(s, {...valid, slug: '-staging'}))
  it('rejects slug longer than 100 chars', () => fail(s, {...valid, slug: 'a'.repeat(101)}))

  it('rejects missing isDefault', () => fail(s, {name: 'Staging', slug: 'staging'}))
  it('rejects wrong type for isDefault (string)', () => fail(s, {...valid, isDefault: 'yes'}))

  it('rejects wrong type for variables (string)', () => fail(s, {...valid, variables: 'bad'}))
  it('rejects wrong type for variables (array)', () => fail(s, {...valid, variables: ['x']}))
})

describe('UpdateEnvironmentRequest negative validation', () => {
  const s = schemas.UpdateEnvironmentRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for variables', () => pass(s, {variables: null}))
  it('accepts null for isDefault', () => pass(s, {isDefault: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 123}))
  it('rejects name longer than 100 chars', () => fail(s, {name: 'x'.repeat(101)}))
  it('rejects wrong type for isDefault (string)', () => fail(s, {isDefault: 'no'}))
  it('rejects wrong type for variables (string)', () => fail(s, {variables: 'bad'}))
})

// =====================================================================
// 14. SecretDto
// =====================================================================

describe('SecretDto negative validation', () => {
  const s = schemas.SecretDto

  it('accepts valid SecretDto', () => pass(s, validSecretDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validSecretDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validSecretDto, id: 'secret-1'}))

  it('rejects missing key', () => {
    const {key: _, ...rest} = validSecretDto
    fail(s, rest)
  })

  it('rejects wrong type for key (number)', () => fail(s, {...validSecretDto, key: 42}))

  it('rejects missing dekVersion', () => {
    const {dekVersion: _, ...rest} = validSecretDto
    fail(s, rest)
  })

  it('rejects wrong type for dekVersion (string)', () =>
    fail(s, {...validSecretDto, dekVersion: 'one'}))

  it('rejects missing valueHash', () => {
    const {valueHash: _, ...rest} = validSecretDto
    fail(s, rest)
  })

  it('rejects wrong type for valueHash (number)', () =>
    fail(s, {...validSecretDto, valueHash: 123}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = validSecretDto
    fail(s, rest)
  })

  it('rejects non-datetime createdAt', () =>
    fail(s, {...validSecretDto, createdAt: 'yesterday'}))

  it('rejects null for non-nullable key', () => fail(s, {...validSecretDto, key: null}))
  it('rejects null for non-nullable id', () => fail(s, {...validSecretDto, id: null}))
  it('rejects null for non-nullable dekVersion', () => fail(s, {...validSecretDto, dekVersion: null}))
})

// =====================================================================
// 15. CreateSecretRequest / UpdateSecretRequest
// =====================================================================

describe('CreateSecretRequest negative validation', () => {
  const s = schemas.CreateSecretRequest
  const valid = {key: 'API_KEY', value: 'sk-test'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing key', () => fail(s, {value: 'test'}))
  it('rejects wrong type for key (number)', () => fail(s, {key: 42, value: 'test'}))
  it('rejects key longer than 255 chars', () => fail(s, {key: 'x'.repeat(256), value: 'test'}))

  it('rejects missing value', () => fail(s, {key: 'API_KEY'}))
  it('rejects wrong type for value (number)', () => fail(s, {key: 'API_KEY', value: 42}))
  it('rejects value longer than 32768 chars', () => fail(s, {key: 'K', value: 'x'.repeat(32769)}))
})

describe('UpdateSecretRequest negative validation', () => {
  const s = schemas.UpdateSecretRequest

  it('accepts valid request', () => pass(s, {value: 'new-value'}))
  it('rejects missing value', () => fail(s, {}))
  it('rejects wrong type for value (number)', () => fail(s, {value: 42}))
  it('rejects value longer than 32768 chars', () => fail(s, {value: 'x'.repeat(32769)}))
})

// =====================================================================
// 16. TagDto
// =====================================================================

describe('TagDto negative validation', () => {
  const s = schemas.TagDto

  it('accepts valid TagDto', () => pass(s, validTagDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validTagDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validTagDto, id: 'tag-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validTagDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validTagDto, name: ''}))
  it('rejects wrong type for name (number)', () => fail(s, {...validTagDto, name: 42}))

  it('rejects missing color', () => {
    const {color: _, ...rest} = validTagDto
    fail(s, rest)
  })

  it('rejects empty color', () => fail(s, {...validTagDto, color: ''}))
  it('rejects wrong type for color (number)', () => fail(s, {...validTagDto, color: 255}))

  it('rejects missing organizationId', () => {
    const {organizationId: _, ...rest} = validTagDto
    fail(s, rest)
  })

  it('rejects wrong type for organizationId (string)', () =>
    fail(s, {...validTagDto, organizationId: 'one'}))

  it('rejects null for non-nullable name', () => fail(s, {...validTagDto, name: null}))
  it('rejects null for non-nullable color', () => fail(s, {...validTagDto, color: null}))
  it('rejects null for non-nullable id', () => fail(s, {...validTagDto, id: null}))
})

// =====================================================================
// 17. CreateTagRequest / UpdateTagRequest
// =====================================================================

describe('CreateTagRequest negative validation', () => {
  const s = schemas.CreateTagRequest

  it('accepts valid request', () => pass(s, {name: 'prod'}))
  it('accepts with color', () => pass(s, {name: 'prod', color: '#FF0000'}))

  it('rejects missing name', () => fail(s, {}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 100 chars', () => fail(s, {name: 'x'.repeat(101)}))

  it('rejects invalid color (named)', () => fail(s, {name: 'prod', color: 'red'}))
  it('rejects invalid color (missing hash)', () => fail(s, {name: 'prod', color: 'FF0000'}))
  it('rejects invalid color (wrong hex)', () => fail(s, {name: 'prod', color: '#GG0000'}))
  it('rejects wrong type for color (number)', () => fail(s, {name: 'prod', color: 0xFF0000}))
})

describe('UpdateTagRequest negative validation', () => {
  const s = schemas.UpdateTagRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for color', () => pass(s, {color: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 100 chars', () => fail(s, {name: 'x'.repeat(101)}))
  it('rejects invalid color format', () => fail(s, {color: 'blue'}))
  it('rejects wrong type for color (number)', () => fail(s, {color: 0xFF}))
})

// =====================================================================
// 18. ResourceGroupDto
// =====================================================================

describe('ResourceGroupDto negative validation', () => {
  const s = schemas.ResourceGroupDto

  it('accepts valid ResourceGroupDto', () => pass(s, validResourceGroupDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validResourceGroupDto, id: 'rg-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validResourceGroupDto, name: ''}))
  it('rejects wrong type for name (number)', () => fail(s, {...validResourceGroupDto, name: 42}))

  it('rejects missing slug', () => {
    const {slug: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects empty slug', () => fail(s, {...validResourceGroupDto, slug: ''}))

  it('rejects missing organizationId', () => {
    const {organizationId: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for organizationId (string)', () =>
    fail(s, {...validResourceGroupDto, organizationId: 'one'}))

  it('rejects missing suppressMemberAlerts', () => {
    const {suppressMemberAlerts: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for suppressMemberAlerts (string)', () =>
    fail(s, {...validResourceGroupDto, suppressMemberAlerts: 'no'}))

  it('rejects missing health', () => {
    const {health: _, ...rest} = validResourceGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for health (string)', () =>
    fail(s, {...validResourceGroupDto, health: 'good'}))

  it('rejects health with invalid status enum', () =>
    fail(s, {...validResourceGroupDto, health: {status: 'critical', totalMembers: 0, operationalCount: 0, activeIncidents: 0}}))

  it('rejects non-UUID alertPolicyId', () =>
    fail(s, {...validResourceGroupDto, alertPolicyId: 'policy-1'}))

  it('rejects non-UUID defaultEnvironmentId', () =>
    fail(s, {...validResourceGroupDto, defaultEnvironmentId: 'env-1'}))

  it('rejects invalid healthThresholdType enum', () =>
    fail(s, {...validResourceGroupDto, healthThresholdType: 'ABSOLUTE'}))

  it('rejects null for non-nullable id', () => fail(s, {...validResourceGroupDto, id: null}))
  it('rejects null for non-nullable name', () => fail(s, {...validResourceGroupDto, name: null}))
  it('rejects null for non-nullable health', () => fail(s, {...validResourceGroupDto, health: null}))
})

// =====================================================================
// 19. CreateResourceGroupRequest
// =====================================================================

describe('CreateResourceGroupRequest negative validation', () => {
  const s = schemas.CreateResourceGroupRequest
  const valid = {name: 'API Services'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => fail(s, {}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))

  it('rejects non-UUID alertPolicyId', () => fail(s, {...valid, alertPolicyId: 'policy-1'}))
  it('rejects non-UUID defaultEnvironmentId', () => fail(s, {...valid, defaultEnvironmentId: 'env-1'}))

  it('rejects defaultFrequency below 30', () => fail(s, {...valid, defaultFrequency: 29}))
  it('rejects defaultFrequency above 86400', () => fail(s, {...valid, defaultFrequency: 86401}))
  it('rejects non-integer defaultFrequency', () => fail(s, {...valid, defaultFrequency: 30.5}))
  it('rejects wrong type for defaultFrequency (string)', () =>
    fail(s, {...valid, defaultFrequency: 'fast'}))

  it('rejects wrong type for defaultRegions (string)', () =>
    fail(s, {...valid, defaultRegions: 'us-east'}))

  it('rejects wrong type for defaultRetryStrategy (string)', () =>
    fail(s, {...valid, defaultRetryStrategy: 'exponential'}))

  it('rejects non-UUID defaultAlertChannels items', () =>
    fail(s, {...valid, defaultAlertChannels: ['bad-id']}))

  it('rejects invalid healthThresholdType enum', () =>
    fail(s, {...valid, healthThresholdType: 'ABSOLUTE'}))

  it('rejects healthThresholdValue below 0', () =>
    fail(s, {...valid, healthThresholdValue: -1}))

  it('rejects healthThresholdValue above 100', () =>
    fail(s, {...valid, healthThresholdValue: 101}))

  it('rejects wrong type for suppressMemberAlerts (string)', () =>
    fail(s, {...valid, suppressMemberAlerts: 'yes'}))

  it('rejects confirmationDelaySeconds below 0', () =>
    fail(s, {...valid, confirmationDelaySeconds: -1}))

  it('rejects confirmationDelaySeconds above 600', () =>
    fail(s, {...valid, confirmationDelaySeconds: 601}))

  it('rejects recoveryCooldownMinutes below 0', () =>
    fail(s, {...valid, recoveryCooldownMinutes: -1}))

  it('rejects recoveryCooldownMinutes above 60', () =>
    fail(s, {...valid, recoveryCooldownMinutes: 61}))
})

// =====================================================================
// 20. AddResourceGroupMemberRequest
// =====================================================================

describe('AddResourceGroupMemberRequest negative validation', () => {
  const s = schemas.AddResourceGroupMemberRequest
  const valid = {memberType: 'monitor', memberId: UUID}

  it('accepts valid request (monitor)', () => pass(s, valid))
  it('accepts valid request (service)', () => pass(s, {memberType: 'service', memberId: UUID}))

  it('rejects missing memberType', () => fail(s, {memberId: UUID}))
  it('rejects invalid memberType', () => fail(s, {memberType: 'alert', memberId: UUID}))
  it('rejects empty memberType', () => fail(s, {memberType: '', memberId: UUID}))

  it('rejects missing memberId', () => fail(s, {memberType: 'monitor'}))
  it('rejects non-UUID memberId', () => fail(s, {memberType: 'monitor', memberId: 'mon-123'}))
  it('rejects wrong type for memberId (number)', () => fail(s, {memberType: 'monitor', memberId: 123}))
})

// =====================================================================
// 21. WebhookEndpointDto
// =====================================================================

describe('WebhookEndpointDto negative validation', () => {
  const s = schemas.WebhookEndpointDto

  it('accepts valid WebhookEndpointDto', () => pass(s, validWebhookEndpointDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validWebhookEndpointDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validWebhookEndpointDto, id: 'wh-1'}))

  it('rejects missing url', () => {
    const {url: _, ...rest} = validWebhookEndpointDto
    fail(s, rest)
  })

  it('rejects wrong type for url (number)', () => fail(s, {...validWebhookEndpointDto, url: 123}))

  it('rejects missing subscribedEvents', () => {
    const {subscribedEvents: _, ...rest} = validWebhookEndpointDto
    fail(s, rest)
  })

  it('rejects wrong type for subscribedEvents (string)', () =>
    fail(s, {...validWebhookEndpointDto, subscribedEvents: 'monitor.created'}))

  it('rejects missing enabled', () => {
    const {enabled: _, ...rest} = validWebhookEndpointDto
    fail(s, rest)
  })

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...validWebhookEndpointDto, enabled: 'yes'}))

  it('rejects missing consecutiveFailures', () => {
    const {consecutiveFailures: _, ...rest} = validWebhookEndpointDto
    fail(s, rest)
  })

  it('rejects wrong type for consecutiveFailures (string)', () =>
    fail(s, {...validWebhookEndpointDto, consecutiveFailures: 'zero'}))

  it('rejects null for non-nullable id', () => fail(s, {...validWebhookEndpointDto, id: null}))
  it('rejects null for non-nullable url', () => fail(s, {...validWebhookEndpointDto, url: null}))
  it('rejects null for non-nullable enabled', () => fail(s, {...validWebhookEndpointDto, enabled: null}))
})

// =====================================================================
// 22. CreateWebhookEndpointRequest / UpdateWebhookEndpointRequest
// =====================================================================

describe('CreateWebhookEndpointRequest negative validation', () => {
  const s = schemas.CreateWebhookEndpointRequest
  const valid = {url: 'https://example.com/hook', subscribedEvents: ['monitor.created']}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing url', () => fail(s, {subscribedEvents: ['monitor.created']}))
  it('rejects wrong type for url (number)', () =>
    fail(s, {url: 123, subscribedEvents: ['monitor.created']}))
  it('rejects url longer than 2048 chars', () =>
    fail(s, {url: 'https://x.com/' + 'a'.repeat(2040), subscribedEvents: ['e']}))

  it('rejects missing subscribedEvents', () => fail(s, {url: 'https://x.com/hook'}))
  it('rejects empty subscribedEvents', () => fail(s, {url: 'https://x.com/hook', subscribedEvents: []}))
  it('rejects wrong type for subscribedEvents (string)', () =>
    fail(s, {url: 'https://x.com/hook', subscribedEvents: 'monitor.created'}))

  it('rejects subscribedEvents items that are empty strings', () =>
    fail(s, {url: 'https://x.com/hook', subscribedEvents: ['']}))

  it('rejects wrong type for description (number)', () =>
    fail(s, {...valid, description: 42}))
  it('rejects description longer than 255 chars', () =>
    fail(s, {...valid, description: 'x'.repeat(256)}))
})

describe('UpdateWebhookEndpointRequest negative validation', () => {
  const s = schemas.UpdateWebhookEndpointRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for url', () => pass(s, {url: null}))
  it('accepts null for subscribedEvents', () => pass(s, {subscribedEvents: null}))
  it('accepts null for enabled', () => pass(s, {enabled: null}))
  it('accepts null for description', () => pass(s, {description: null}))

  it('rejects wrong type for url (number)', () => fail(s, {url: 123}))
  it('rejects url longer than 2048 chars', () => fail(s, {url: 'x'.repeat(2049)}))
  it('rejects wrong type for subscribedEvents (string)', () =>
    fail(s, {subscribedEvents: 'monitor.created'}))
  it('rejects wrong type for enabled (string)', () => fail(s, {enabled: 'yes'}))
  it('rejects wrong type for description (number)', () => fail(s, {description: 42}))
  it('rejects description longer than 255 chars', () => fail(s, {description: 'x'.repeat(256)}))
})

// =====================================================================
// 23. ApiKeyDto
// =====================================================================

describe('ApiKeyDto negative validation', () => {
  const s = schemas.ApiKeyDto

  it('accepts valid ApiKeyDto', () => pass(s, validApiKeyDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validApiKeyDto
    fail(s, rest)
  })

  it('rejects wrong type for id (string)', () => fail(s, {...validApiKeyDto, id: 'key-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validApiKeyDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validApiKeyDto, name: ''}))
  it('rejects wrong type for name (number)', () => fail(s, {...validApiKeyDto, name: 42}))

  it('rejects missing key', () => {
    const {key: _, ...rest} = validApiKeyDto
    fail(s, rest)
  })

  it('rejects empty key', () => fail(s, {...validApiKeyDto, key: ''}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = validApiKeyDto
    fail(s, rest)
  })

  it('rejects non-datetime createdAt', () => fail(s, {...validApiKeyDto, createdAt: 'today'}))

  it('rejects missing updatedAt', () => {
    const {updatedAt: _, ...rest} = validApiKeyDto
    fail(s, rest)
  })

  it('rejects null for non-nullable id', () => fail(s, {...validApiKeyDto, id: null}))
  it('rejects null for non-nullable name', () => fail(s, {...validApiKeyDto, name: null}))
  it('rejects null for non-nullable key', () => fail(s, {...validApiKeyDto, key: null}))
  it('rejects non-integer id', () => fail(s, {...validApiKeyDto, id: 1.5}))
})

// =====================================================================
// 24. CreateApiKeyRequest
// =====================================================================

describe('CreateApiKeyRequest negative validation', () => {
  const s = schemas.CreateApiKeyRequest

  it('accepts valid request', () => pass(s, {name: 'CI Key'}))
  it('accepts with expiresAt', () => pass(s, {name: 'CI Key', expiresAt: ISO}))

  it('rejects missing name', () => fail(s, {}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 200 chars', () => fail(s, {name: 'x'.repeat(201)}))

  it('rejects non-datetime expiresAt', () => fail(s, {name: 'K', expiresAt: 'tomorrow'}))
  it('rejects wrong type for expiresAt (number)', () => fail(s, {name: 'K', expiresAt: 12345}))
  it('rejects wrong type for expiresAt (boolean)', () => fail(s, {name: 'K', expiresAt: true}))
})

// =====================================================================
// 25. AcquireDeployLockRequest
// =====================================================================

describe('AcquireDeployLockRequest negative validation', () => {
  const s = schemas.AcquireDeployLockRequest

  it('accepts valid request', () => pass(s, {lockedBy: 'ci-pipeline'}))
  it('accepts with ttlMinutes', () => pass(s, {lockedBy: 'ci', ttlMinutes: 30}))

  it('rejects missing lockedBy', () => fail(s, {}))
  it('rejects empty lockedBy', () => fail(s, {lockedBy: ''}))
  it('rejects wrong type for lockedBy (number)', () => fail(s, {lockedBy: 42}))

  it('rejects wrong type for ttlMinutes (string)', () =>
    fail(s, {lockedBy: 'ci', ttlMinutes: 'thirty'}))
  it('rejects non-integer ttlMinutes', () =>
    fail(s, {lockedBy: 'ci', ttlMinutes: 30.5}))
})

// =====================================================================
// 26. DeployLockDto
// =====================================================================

describe('DeployLockDto negative validation', () => {
  const s = schemas.DeployLockDto

  it('accepts valid DeployLockDto', () => pass(s, validDeployLockDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validDeployLockDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validDeployLockDto, id: 'lock-1'}))

  it('rejects missing lockedBy', () => {
    const {lockedBy: _, ...rest} = validDeployLockDto
    fail(s, rest)
  })

  it('rejects empty lockedBy', () => fail(s, {...validDeployLockDto, lockedBy: ''}))
  it('rejects wrong type for lockedBy (number)', () => fail(s, {...validDeployLockDto, lockedBy: 42}))

  it('rejects missing lockedAt', () => {
    const {lockedAt: _, ...rest} = validDeployLockDto
    fail(s, rest)
  })

  it('rejects non-datetime lockedAt', () => fail(s, {...validDeployLockDto, lockedAt: 'now'}))

  it('rejects missing expiresAt', () => {
    const {expiresAt: _, ...rest} = validDeployLockDto
    fail(s, rest)
  })

  it('rejects non-datetime expiresAt', () => fail(s, {...validDeployLockDto, expiresAt: 'later'}))

  it('rejects null for non-nullable id', () => fail(s, {...validDeployLockDto, id: null}))
  it('rejects null for non-nullable lockedBy', () => fail(s, {...validDeployLockDto, lockedBy: null}))
  it('rejects null for non-nullable lockedAt', () => fail(s, {...validDeployLockDto, lockedAt: null}))
  it('rejects null for non-nullable expiresAt', () => fail(s, {...validDeployLockDto, expiresAt: null}))
})

// =====================================================================
// 27. DashboardOverviewDto
// =====================================================================

describe('DashboardOverviewDto negative validation', () => {
  const s = schemas.DashboardOverviewDto

  it('accepts valid DashboardOverviewDto', () => pass(s, validDashboardOverviewDto))

  it('rejects missing monitors', () => {
    const {monitors: _, ...rest} = validDashboardOverviewDto
    fail(s, rest)
  })

  it('rejects wrong type for monitors (string)', () =>
    fail(s, {...validDashboardOverviewDto, monitors: 'good'}))

  it('rejects missing incidents', () => {
    const {incidents: _, ...rest} = validDashboardOverviewDto
    fail(s, rest)
  })

  it('rejects wrong type for incidents (string)', () =>
    fail(s, {...validDashboardOverviewDto, incidents: 'none'}))

  it('rejects monitors missing total', () => {
    const {total: _, ...rest} = validDashboardOverviewDto.monitors
    fail(s, {...validDashboardOverviewDto, monitors: rest})
  })

  it('rejects monitors with wrong type for total (string)', () =>
    fail(s, {...validDashboardOverviewDto, monitors: {...validDashboardOverviewDto.monitors, total: 'ten'}}))

  it('rejects monitors missing up', () => {
    const {up: _, ...rest} = validDashboardOverviewDto.monitors
    fail(s, {...validDashboardOverviewDto, monitors: rest})
  })

  it('rejects monitors missing down', () => {
    const {down: _, ...rest} = validDashboardOverviewDto.monitors
    fail(s, {...validDashboardOverviewDto, monitors: rest})
  })

  it('rejects monitors missing degraded', () => {
    const {degraded: _, ...rest} = validDashboardOverviewDto.monitors
    fail(s, {...validDashboardOverviewDto, monitors: rest})
  })

  it('rejects monitors missing paused', () => {
    const {paused: _, ...rest} = validDashboardOverviewDto.monitors
    fail(s, {...validDashboardOverviewDto, monitors: rest})
  })

  it('rejects incidents missing active', () => {
    const {active: _, ...rest} = validDashboardOverviewDto.incidents
    fail(s, {...validDashboardOverviewDto, incidents: rest})
  })

  it('rejects incidents missing resolvedToday', () => {
    const {resolvedToday: _, ...rest} = validDashboardOverviewDto.incidents
    fail(s, {...validDashboardOverviewDto, incidents: rest})
  })

  it('rejects incidents with wrong type for active (string)', () =>
    fail(s, {...validDashboardOverviewDto, incidents: {...validDashboardOverviewDto.incidents, active: 'one'}}))

  it('rejects null for non-nullable monitors', () =>
    fail(s, {...validDashboardOverviewDto, monitors: null}))

  it('rejects null for non-nullable incidents', () =>
    fail(s, {...validDashboardOverviewDto, incidents: null}))
})

// =====================================================================
// 28. StatusPageDto (extended negative tests)
// =====================================================================

describe('StatusPageDto negative validation', () => {
  const s = schemas.StatusPageDto

  it('accepts valid StatusPageDto', () => pass(s, validStatusPageDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageDto, id: 'sp-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validStatusPageDto, name: ''}))

  it('rejects missing slug', () => {
    const {slug: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects empty slug', () => fail(s, {...validStatusPageDto, slug: ''}))

  it('rejects missing branding', () => {
    const {branding: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects missing visibility', () => {
    const {visibility: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects invalid visibility enum', () => fail(s, {...validStatusPageDto, visibility: 'PRIVATE'}))
  it('rejects lowercase visibility', () => fail(s, {...validStatusPageDto, visibility: 'public'}))

  it('rejects missing enabled', () => {
    const {enabled: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...validStatusPageDto, enabled: 'yes'}))

  it('rejects missing incidentMode', () => {
    const {incidentMode: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects invalid incidentMode', () => fail(s, {...validStatusPageDto, incidentMode: 'AUTO'}))

  it('rejects invalid overallStatus', () =>
    fail(s, {...validStatusPageDto, overallStatus: 'BROKEN'}))

  it('rejects null for non-nullable id', () => fail(s, {...validStatusPageDto, id: null}))
  it('rejects null for non-nullable name', () => fail(s, {...validStatusPageDto, name: null}))
  it('rejects null for non-nullable slug', () => fail(s, {...validStatusPageDto, slug: null}))
  it('rejects null for non-nullable visibility', () => fail(s, {...validStatusPageDto, visibility: null}))
  it('rejects null for non-nullable enabled', () => fail(s, {...validStatusPageDto, enabled: null}))
  it('rejects null for non-nullable incidentMode', () => fail(s, {...validStatusPageDto, incidentMode: null}))

  it('rejects missing organizationId', () => {
    const {organizationId: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects wrong type for organizationId (string)', () =>
    fail(s, {...validStatusPageDto, organizationId: 'one'}))

  it('rejects missing workspaceId', () => {
    const {workspaceId: _, ...rest} = validStatusPageDto
    fail(s, rest)
  })

  it('rejects wrong type for workspaceId (string)', () =>
    fail(s, {...validStatusPageDto, workspaceId: 'ws-1'}))
})

// =====================================================================
// 29. StatusPage sub-resource DTOs and requests
// =====================================================================

describe('StatusPageComponentDto negative validation', () => {
  const s = schemas.StatusPageComponentDto

  it('accepts valid dto', () => pass(s, validStatusPageComponentDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageComponentDto, id: 'comp-1'}))

  it('rejects missing statusPageId', () => {
    const {statusPageId: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects non-UUID statusPageId', () => fail(s, {...validStatusPageComponentDto, statusPageId: 'sp-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validStatusPageComponentDto, name: ''}))

  it('rejects missing type', () => {
    const {type: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects invalid type enum', () => fail(s, {...validStatusPageComponentDto, type: 'SERVICE'}))

  it('rejects missing currentStatus', () => {
    const {currentStatus: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects invalid currentStatus', () =>
    fail(s, {...validStatusPageComponentDto, currentStatus: 'BROKEN'}))

  it('rejects missing showUptime', () => {
    const {showUptime: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects wrong type for showUptime (string)', () =>
    fail(s, {...validStatusPageComponentDto, showUptime: 'yes'}))

  it('rejects missing displayOrder', () => {
    const {displayOrder: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects wrong type for displayOrder (string)', () =>
    fail(s, {...validStatusPageComponentDto, displayOrder: 'first'}))

  it('rejects missing excludeFromOverall', () => {
    const {excludeFromOverall: _, ...rest} = validStatusPageComponentDto
    fail(s, rest)
  })

  it('rejects non-UUID monitorId', () =>
    fail(s, {...validStatusPageComponentDto, monitorId: 'mon-1'}))

  it('rejects non-UUID resourceGroupId', () =>
    fail(s, {...validStatusPageComponentDto, resourceGroupId: 'rg-1'}))
})

describe('StatusPageComponentGroupDto negative validation', () => {
  const s = schemas.StatusPageComponentGroupDto

  it('accepts valid dto', () => pass(s, validStatusPageComponentGroupDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageComponentGroupDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageComponentGroupDto, id: 'grp-1'}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validStatusPageComponentGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for name (number)', () =>
    fail(s, {...validStatusPageComponentGroupDto, name: 42}))

  it('rejects missing displayOrder', () => {
    const {displayOrder: _, ...rest} = validStatusPageComponentGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for displayOrder (string)', () =>
    fail(s, {...validStatusPageComponentGroupDto, displayOrder: 'first'}))

  it('rejects missing collapsed', () => {
    const {collapsed: _, ...rest} = validStatusPageComponentGroupDto
    fail(s, rest)
  })

  it('rejects wrong type for collapsed (string)', () =>
    fail(s, {...validStatusPageComponentGroupDto, collapsed: 'no'}))

  it('rejects components with invalid nested component', () =>
    fail(s, {...validStatusPageComponentGroupDto, components: [{id: 'not-uuid', name: 'Bad'}]}))
})

describe('StatusPageIncidentDto negative validation', () => {
  const s = schemas.StatusPageIncidentDto

  it('accepts valid dto', () => pass(s, validStatusPageIncidentDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageIncidentDto, id: 'inc-1'}))

  it('rejects missing title', () => {
    const {title: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects empty title', () => fail(s, {...validStatusPageIncidentDto, title: ''}))

  it('rejects missing status', () => {
    const {status: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects invalid status', () => fail(s, {...validStatusPageIncidentDto, status: 'OPEN'}))

  it('rejects missing impact', () => {
    const {impact: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects invalid impact', () => fail(s, {...validStatusPageIncidentDto, impact: 'APOCALYPTIC'}))

  it('rejects missing scheduled', () => {
    const {scheduled: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for scheduled (string)', () =>
    fail(s, {...validStatusPageIncidentDto, scheduled: 'no'}))

  it('rejects missing autoResolve', () => {
    const {autoResolve: _, ...rest} = validStatusPageIncidentDto
    fail(s, rest)
  })

  it('rejects wrong type for autoResolve (string)', () =>
    fail(s, {...validStatusPageIncidentDto, autoResolve: 'yes'}))

  it('rejects non-UUID statusPageId', () =>
    fail(s, {...validStatusPageIncidentDto, statusPageId: 'sp-1'}))

  it('rejects non-UUID incidentId', () =>
    fail(s, {...validStatusPageIncidentDto, incidentId: 'inc-ref'}))

  it('rejects affectedComponents with invalid nested component', () =>
    fail(s, {...validStatusPageIncidentDto, affectedComponents: [{statusPageComponentId: 'bad', componentStatus: 'UP', componentName: 'x'}]}))
})

describe('StatusPageIncidentUpdateDto negative validation', () => {
  const s = schemas.StatusPageIncidentUpdateDto

  it('accepts valid dto', () => pass(s, validStatusPageIncidentUpdateDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageIncidentUpdateDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageIncidentUpdateDto, id: 'upd-1'}))

  it('rejects missing status', () => {
    const {status: _, ...rest} = validStatusPageIncidentUpdateDto
    fail(s, rest)
  })

  it('rejects invalid status', () => fail(s, {...validStatusPageIncidentUpdateDto, status: 'PANICKING'}))

  it('rejects missing body', () => {
    const {body: _, ...rest} = validStatusPageIncidentUpdateDto
    fail(s, rest)
  })

  it('rejects wrong type for body (number)', () =>
    fail(s, {...validStatusPageIncidentUpdateDto, body: 42}))

  it('rejects missing notifySubscribers', () => {
    const {notifySubscribers: _, ...rest} = validStatusPageIncidentUpdateDto
    fail(s, rest)
  })

  it('rejects wrong type for notifySubscribers (string)', () =>
    fail(s, {...validStatusPageIncidentUpdateDto, notifySubscribers: 'yes'}))
})

describe('StatusPageSubscriberDto negative validation', () => {
  const s = schemas.StatusPageSubscriberDto

  it('accepts valid dto', () => pass(s, validStatusPageSubscriberDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageSubscriberDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageSubscriberDto, id: 'sub-1'}))

  it('rejects missing email', () => {
    const {email: _, ...rest} = validStatusPageSubscriberDto
    fail(s, rest)
  })

  it('rejects wrong type for email (number)', () =>
    fail(s, {...validStatusPageSubscriberDto, email: 42}))

  it('rejects missing confirmed', () => {
    const {confirmed: _, ...rest} = validStatusPageSubscriberDto
    fail(s, rest)
  })

  it('rejects wrong type for confirmed (string)', () =>
    fail(s, {...validStatusPageSubscriberDto, confirmed: 'yes'}))
})

describe('StatusPageCustomDomainDto negative validation', () => {
  const s = schemas.StatusPageCustomDomainDto

  it('accepts valid dto', () => pass(s, validStatusPageCustomDomainDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validStatusPageCustomDomainDto, id: 'dom-1'}))

  it('rejects missing hostname', () => {
    const {hostname: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects wrong type for hostname (number)', () =>
    fail(s, {...validStatusPageCustomDomainDto, hostname: 42}))

  it('rejects missing status', () => {
    const {status: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects invalid status enum', () =>
    fail(s, {...validStatusPageCustomDomainDto, status: 'READY'}))

  it('rejects missing verificationMethod', () => {
    const {verificationMethod: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects invalid verificationMethod', () =>
    fail(s, {...validStatusPageCustomDomainDto, verificationMethod: 'DNS'}))

  it('rejects missing verificationToken', () => {
    const {verificationToken: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects missing verificationCnameTarget', () => {
    const {verificationCnameTarget: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects missing primary', () => {
    const {primary: _, ...rest} = validStatusPageCustomDomainDto
    fail(s, rest)
  })

  it('rejects wrong type for primary (string)', () =>
    fail(s, {...validStatusPageCustomDomainDto, primary: 'yes'}))

  it('validates all valid status enums', () => {
    for (const st of ['PENDING_VERIFICATION', 'VERIFICATION_FAILED', 'VERIFIED', 'SSL_PENDING', 'ACTIVE', 'FAILED', 'REMOVED']) {
      pass(s, {...validStatusPageCustomDomainDto, status: st})
    }
  })
})

// ── Status Page request schemas ──────────────────────────────────────

describe('CreateStatusPageComponentRequest negative validation', () => {
  const s = schemas.CreateStatusPageComponentRequest
  const valid = {name: 'API', type: 'STATIC'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => fail(s, {type: 'STATIC'}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42, type: 'STATIC'}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256), type: 'STATIC'}))

  it('rejects missing type', () => fail(s, {name: 'API'}))
  it('rejects invalid type enum', () => fail(s, {name: 'API', type: 'SERVICE'}))
  it('rejects lowercase type', () => fail(s, {name: 'API', type: 'static'}))

  it('rejects non-UUID monitorId', () => fail(s, {...valid, monitorId: 'mon-1'}))
  it('rejects non-UUID resourceGroupId', () => fail(s, {...valid, resourceGroupId: 'rg-1'}))
  it('rejects non-UUID groupId', () => fail(s, {...valid, groupId: 'grp-1'}))

  it('rejects wrong type for showUptime (string)', () => fail(s, {...valid, showUptime: 'yes'}))
  it('rejects wrong type for displayOrder (string)', () => fail(s, {...valid, displayOrder: 'first'}))
  it('rejects non-integer displayOrder', () => fail(s, {...valid, displayOrder: 1.5}))
  it('rejects description longer than 500 chars', () => fail(s, {...valid, description: 'x'.repeat(501)}))
})

describe('UpdateStatusPageComponentRequest negative validation', () => {
  const s = schemas.UpdateStatusPageComponentRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for description', () => pass(s, {description: null}))
  it('accepts null for groupId', () => pass(s, {groupId: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))
  it('rejects non-UUID groupId', () => fail(s, {groupId: 'grp-1'}))
  it('rejects wrong type for showUptime (string)', () => fail(s, {showUptime: 'yes'}))
  it('rejects wrong type for displayOrder (string)', () => fail(s, {displayOrder: 'first'}))
  it('rejects description longer than 500 chars', () => fail(s, {description: 'x'.repeat(501)}))
})

describe('CreateStatusPageComponentGroupRequest negative validation', () => {
  const s = schemas.CreateStatusPageComponentGroupRequest
  const valid = {name: 'Infrastructure'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing name', () => fail(s, {}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))

  it('rejects description longer than 500 chars', () => fail(s, {...valid, description: 'x'.repeat(501)}))
  it('rejects wrong type for displayOrder (string)', () => fail(s, {...valid, displayOrder: 'first'}))
  it('rejects non-integer displayOrder', () => fail(s, {...valid, displayOrder: 1.5}))
  it('rejects wrong type for collapsed (string)', () => fail(s, {...valid, collapsed: 'no'}))
})

describe('UpdateStatusPageComponentGroupRequest negative validation', () => {
  const s = schemas.UpdateStatusPageComponentGroupRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for description', () => pass(s, {description: null}))
  it('accepts null for displayOrder', () => pass(s, {displayOrder: null}))
  it('accepts null for collapsed', () => pass(s, {collapsed: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))
  it('rejects description longer than 500 chars', () => fail(s, {description: 'x'.repeat(501)}))
  it('rejects wrong type for displayOrder (string)', () => fail(s, {displayOrder: 'first'}))
  it('rejects wrong type for collapsed (string)', () => fail(s, {collapsed: 'no'}))
})

describe('CreateStatusPageIncidentRequest negative validation', () => {
  const s = schemas.CreateStatusPageIncidentRequest
  const valid = {title: 'DB outage', impact: 'MAJOR', body: 'Investigating'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing title', () => fail(s, {impact: 'MAJOR', body: 'text'}))
  it('rejects wrong type for title (number)', () => fail(s, {title: 42, impact: 'MAJOR', body: 'text'}))
  it('rejects title longer than 500 chars', () => fail(s, {title: 'x'.repeat(501), impact: 'MAJOR', body: 'text'}))

  it('rejects missing impact', () => fail(s, {title: 'test', body: 'text'}))
  it('rejects invalid impact enum', () => fail(s, {title: 'test', impact: 'APOCALYPTIC', body: 'text'}))

  it('rejects missing body', () => fail(s, {title: 'test', impact: 'MAJOR'}))
  it('rejects empty body', () => fail(s, {title: 'test', impact: 'MAJOR', body: ''}))
  it('rejects wrong type for body (number)', () => fail(s, {title: 'test', impact: 'MAJOR', body: 42}))

  it('rejects invalid status enum', () =>
    fail(s, {...valid, status: 'PANICKING'}))

  it('rejects wrong type for scheduled (string)', () =>
    fail(s, {...valid, scheduled: 'yes'}))

  it('rejects non-datetime scheduledFor', () =>
    fail(s, {...valid, scheduledFor: 'tomorrow'}))

  it('rejects wrong type for autoResolve (string)', () =>
    fail(s, {...valid, autoResolve: 'yes'}))

  it('rejects wrong type for notifySubscribers (string)', () =>
    fail(s, {...valid, notifySubscribers: 'yes'}))

  it('rejects affectedComponents with invalid componentId', () =>
    fail(s, {...valid, affectedComponents: [{componentId: 'bad', status: 'OPERATIONAL'}]}))

  it('rejects affectedComponents with invalid status', () =>
    fail(s, {...valid, affectedComponents: [{componentId: UUID, status: 'BROKEN'}]}))
})

describe('UpdateStatusPageIncidentRequest negative validation', () => {
  const s = schemas.UpdateStatusPageIncidentRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for title', () => pass(s, {title: null}))
  it('accepts null for status', () => pass(s, {status: null}))
  it('accepts null for impact', () => pass(s, {impact: null}))

  it('rejects wrong type for title (number)', () => fail(s, {title: 42}))
  it('rejects title longer than 500 chars', () => fail(s, {title: 'x'.repeat(501)}))
  it('rejects invalid status enum', () => fail(s, {status: 'PANICKING'}))
  it('rejects invalid impact enum', () => fail(s, {impact: 'APOCALYPTIC'}))

  it('rejects postmortemUrl with invalid format', () =>
    fail(s, {postmortemUrl: 'not-a-url'}))
  it('accepts postmortemUrl with https', () =>
    pass(s, {postmortemUrl: 'https://example.com/postmortem'}))
  it('rejects postmortemUrl with ftp', () =>
    fail(s, {postmortemUrl: 'ftp://example.com/postmortem'}))
})

describe('AdminAddSubscriberRequest negative validation', () => {
  const s = schemas.AdminAddSubscriberRequest

  it('rejects missing email', () => fail(s, {}))
  it('rejects empty email', () => fail(s, {email: ''}))
  it('rejects invalid email format', () => fail(s, {email: 'not-an-email'}))
  it('rejects email without domain', () => fail(s, {email: 'user@'}))
  it('rejects wrong type for email (number)', () => fail(s, {email: 42}))
})

describe('AddCustomDomainRequest negative validation', () => {
  const s = schemas.AddCustomDomainRequest

  it('rejects missing hostname', () => fail(s, {}))
  it('rejects empty hostname', () => fail(s, {hostname: ''}))
  it('rejects hostname with uppercase', () => fail(s, {hostname: 'Status.Example.com'}))
  it('rejects single-label hostname', () => fail(s, {hostname: 'localhost'}))
  it('rejects hostname with special chars', () => fail(s, {hostname: 'status!.example.com'}))
  it('rejects hostname longer than 255 chars', () => fail(s, {hostname: 'x'.repeat(256)}))
  it('rejects wrong type for hostname (number)', () => fail(s, {hostname: 42}))
})

// =====================================================================
// 30. CheckResultDto
// =====================================================================

describe('CheckResultDto negative validation', () => {
  const s = schemas.CheckResultDto

  it('accepts valid CheckResultDto', () => pass(s, validCheckResultDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validCheckResultDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validCheckResultDto, id: 'cr-1'}))

  it('rejects missing timestamp', () => {
    const {timestamp: _, ...rest} = validCheckResultDto
    fail(s, rest)
  })

  it('rejects non-datetime timestamp', () => fail(s, {...validCheckResultDto, timestamp: 'now'}))

  it('rejects missing region', () => {
    const {region: _, ...rest} = validCheckResultDto
    fail(s, rest)
  })

  it('rejects wrong type for region (number)', () => fail(s, {...validCheckResultDto, region: 1}))

  it('rejects missing passed', () => {
    const {passed: _, ...rest} = validCheckResultDto
    fail(s, rest)
  })

  it('rejects wrong type for passed (string)', () => fail(s, {...validCheckResultDto, passed: 'yes'}))

  it('rejects null for non-nullable id', () => fail(s, {...validCheckResultDto, id: null}))
  it('rejects null for non-nullable timestamp', () => fail(s, {...validCheckResultDto, timestamp: null}))
  it('rejects null for non-nullable region', () => fail(s, {...validCheckResultDto, region: null}))
  it('rejects null for non-nullable passed', () => fail(s, {...validCheckResultDto, passed: null}))

  it('rejects wrong type for responseTimeMs (string)', () =>
    fail(s, {...validCheckResultDto, responseTimeMs: 'fast'}))

  it('rejects non-integer responseTimeMs', () =>
    fail(s, {...validCheckResultDto, responseTimeMs: 123.5}))

  it('rejects non-UUID checkId', () =>
    fail(s, {...validCheckResultDto, checkId: 'ck-1'}))
})

// =====================================================================
// 31. MonitorVersionDto
// =====================================================================

describe('MonitorVersionDto negative validation', () => {
  const s = schemas.MonitorVersionDto

  it('accepts valid MonitorVersionDto', () => pass(s, validMonitorVersionDto))

  it('rejects missing id', () => {
    const {id: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects non-UUID id', () => fail(s, {...validMonitorVersionDto, id: 'mv-1'}))

  it('rejects missing monitorId', () => {
    const {monitorId: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects non-UUID monitorId', () => fail(s, {...validMonitorVersionDto, monitorId: 'mon-1'}))

  it('rejects missing version', () => {
    const {version: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects wrong type for version (string)', () =>
    fail(s, {...validMonitorVersionDto, version: 'v1'}))

  it('rejects non-integer version', () =>
    fail(s, {...validMonitorVersionDto, version: 1.5}))

  it('rejects missing snapshot', () => {
    const {snapshot: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects wrong type for snapshot (string)', () =>
    fail(s, {...validMonitorVersionDto, snapshot: 'snapshot-data'}))

  it('rejects snapshot with invalid MonitorDto', () =>
    fail(s, {...validMonitorVersionDto, snapshot: {id: 'not-uuid', name: 123}}))

  it('rejects missing changedVia', () => {
    const {changedVia: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects invalid changedVia enum', () =>
    fail(s, {...validMonitorVersionDto, changedVia: 'GITHUB'}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = validMonitorVersionDto
    fail(s, rest)
  })

  it('rejects non-datetime createdAt', () =>
    fail(s, {...validMonitorVersionDto, createdAt: 'yesterday'}))

  it('rejects null for non-nullable id', () => fail(s, {...validMonitorVersionDto, id: null}))
  it('rejects null for non-nullable monitorId', () => fail(s, {...validMonitorVersionDto, monitorId: null}))
  it('rejects null for non-nullable version', () => fail(s, {...validMonitorVersionDto, version: null}))
  it('rejects null for non-nullable snapshot', () => fail(s, {...validMonitorVersionDto, snapshot: null}))
  it('rejects null for non-nullable changedVia', () => fail(s, {...validMonitorVersionDto, changedVia: null}))
})

// =====================================================================
// ServiceSubscriptionDto
// =====================================================================

describe('ServiceSubscriptionDto negative validation', () => {
  const s = schemas.ServiceSubscriptionDto

  it('accepts valid ServiceSubscriptionDto', () => pass(s, validServiceSubscriptionDto))

  it('rejects missing subscriptionId', () => {
    const {subscriptionId: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects non-UUID subscriptionId', () =>
    fail(s, {...validServiceSubscriptionDto, subscriptionId: 'sub-1'}))

  it('rejects missing serviceId', () => {
    const {serviceId: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects non-UUID serviceId', () =>
    fail(s, {...validServiceSubscriptionDto, serviceId: 'svc-1'}))

  it('rejects missing slug', () => {
    const {slug: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects empty slug', () => fail(s, {...validServiceSubscriptionDto, slug: ''}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...validServiceSubscriptionDto, name: ''}))

  it('rejects missing adapterType', () => {
    const {adapterType: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects empty adapterType', () =>
    fail(s, {...validServiceSubscriptionDto, adapterType: ''}))

  it('rejects missing pollingIntervalSeconds', () => {
    const {pollingIntervalSeconds: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects wrong type for pollingIntervalSeconds (string)', () =>
    fail(s, {...validServiceSubscriptionDto, pollingIntervalSeconds: 'fast'}))

  it('rejects missing enabled', () => {
    const {enabled: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects wrong type for enabled (string)', () =>
    fail(s, {...validServiceSubscriptionDto, enabled: 'yes'}))

  it('rejects missing alertSensitivity', () => {
    const {alertSensitivity: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects invalid alertSensitivity enum', () =>
    fail(s, {...validServiceSubscriptionDto, alertSensitivity: 'NONE'}))

  it('rejects missing subscribedAt', () => {
    const {subscribedAt: _, ...rest} = validServiceSubscriptionDto
    fail(s, rest)
  })

  it('rejects non-datetime subscribedAt', () =>
    fail(s, {...validServiceSubscriptionDto, subscribedAt: 'yesterday'}))

  it('rejects non-UUID componentId', () =>
    fail(s, {...validServiceSubscriptionDto, componentId: 'comp-1'}))
})

// =====================================================================
// ApiKeyCreateResponse
// =====================================================================

describe('ApiKeyCreateResponse negative validation', () => {
  const s = schemas.ApiKeyCreateResponse
  const valid = {id: 1, name: 'My Key', key: 'dh_xxxx', createdAt: ISO}

  it('accepts valid response', () => pass(s, valid))

  it('rejects missing id', () => {
    const {id: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects wrong type for id (string)', () => fail(s, {...valid, id: 'key-1'}))
  it('rejects non-integer id', () => fail(s, {...valid, id: 1.5}))

  it('rejects missing name', () => {
    const {name: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects empty name', () => fail(s, {...valid, name: ''}))

  it('rejects missing key', () => {
    const {key: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects empty key', () => fail(s, {...valid, key: ''}))

  it('rejects missing createdAt', () => {
    const {createdAt: _, ...rest} = valid
    fail(s, rest)
  })

  it('rejects non-datetime createdAt', () => fail(s, {...valid, createdAt: 'today'}))
  it('rejects non-datetime expiresAt', () => fail(s, {...valid, expiresAt: 'tomorrow'}))
})

// =====================================================================
// Validation layer tests
// =====================================================================

describe('parse() validation layer', () => {
  it('throws DevhelmError with code VALIDATION on invalid data', () => {
    expect(() => parse(schemas.MonitorDto, {id: 123})).toThrow(DevhelmError)
    try {
      parse(schemas.MonitorDto, {id: 123})
    } catch (e) {
      expect(e).toBeInstanceOf(DevhelmError)
      expect((e as DevhelmError).code).toBe('VALIDATION')
    }
  })

  it('throws DevhelmError on completely wrong type (string)', () => {
    expect(() => parse(schemas.MonitorDto, 'not an object')).toThrow(DevhelmError)
  })

  it('throws DevhelmError on null', () => {
    expect(() => parse(schemas.MonitorDto, null)).toThrow(DevhelmError)
  })

  it('throws DevhelmError on undefined', () => {
    expect(() => parse(schemas.MonitorDto, undefined)).toThrow(DevhelmError)
  })

  it('throws DevhelmError on array', () => {
    expect(() => parse(schemas.MonitorDto, [])).toThrow(DevhelmError)
  })

  it('error message includes field path', () => {
    try {
      parse(schemas.MonitorDto, {id: 123, name: 456})
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).message).toMatch(/id/)
    }
  })

  it('error message includes context when provided', () => {
    try {
      parse(schemas.MonitorDto, {id: 123}, 'monitors.get')
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).message).toContain('monitors.get')
    }
  })

  it('error detail contains JSON issue list', () => {
    try {
      parse(schemas.MonitorDto, {}, 'test')
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).detail).toBeDefined()
      const issues = JSON.parse((e as DevhelmError).detail!)
      expect(Array.isArray(issues)).toBe(true)
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('error has status 0', () => {
    try {
      parse(schemas.MonitorDto, {})
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).status).toBe(0)
    }
  })
})

describe('parseSingle() validation layer', () => {
  it('rejects missing data envelope', () => {
    expect(() => parseSingle(schemas.MonitorDto, {})).toThrow(DevhelmError)
  })

  it('rejects null as envelope', () => {
    expect(() => parseSingle(schemas.MonitorDto, null)).toThrow(DevhelmError)
  })

  it('rejects string as envelope', () => {
    expect(() => parseSingle(schemas.MonitorDto, 'bad')).toThrow(DevhelmError)
  })

  it('rejects array as envelope', () => {
    expect(() => parseSingle(schemas.MonitorDto, [])).toThrow(DevhelmError)
  })

  it('rejects data: null inside envelope', () => {
    expect(() => parseSingle(schemas.MonitorDto, {data: null})).toThrow(DevhelmError)
  })

  it('rejects wrong type inside data', () => {
    expect(() => parseSingle(schemas.MonitorDto, {data: 'not an object'})).toThrow(DevhelmError)
  })

  it('rejects wrong shape inside data', () => {
    expect(() => parseSingle(schemas.MonitorDto, {data: {id: 123}})).toThrow(DevhelmError)
  })

  it('unwraps valid envelope', () => {
    const result = parseSingle(schemas.EnvironmentDto, {data: validEnvironmentDto})
    expect(result.name).toBe('Production')
  })

  it('error includes context', () => {
    try {
      parseSingle(schemas.MonitorDto, {data: {}}, 'monitors.get')
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).message).toContain('monitors.get')
    }
  })

  it('error code is VALIDATION', () => {
    try {
      parseSingle(schemas.MonitorDto, {data: {}})
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).code).toBe('VALIDATION')
    }
  })
})

describe('parsePage() validation layer', () => {
  it('rejects missing data field', () => {
    expect(() => parsePage(schemas.MonitorDto, {hasNext: false, hasPrev: false})).toThrow(DevhelmError)
  })

  it('rejects data as non-array', () => {
    expect(() => parsePage(schemas.MonitorDto, {data: 'bad', hasNext: false, hasPrev: false})).toThrow(DevhelmError)
  })

  it('rejects missing hasNext', () => {
    expect(() => parsePage(schemas.MonitorDto, {data: [], hasPrev: false})).toThrow(DevhelmError)
  })

  it('rejects missing hasPrev', () => {
    expect(() => parsePage(schemas.MonitorDto, {data: [], hasNext: false})).toThrow(DevhelmError)
  })

  it('rejects wrong type for hasNext (string)', () => {
    expect(() => parsePage(schemas.MonitorDto, {data: [], hasNext: 'no', hasPrev: false})).toThrow(DevhelmError)
  })

  it('rejects wrong type for hasPrev (string)', () => {
    expect(() => parsePage(schemas.MonitorDto, {data: [], hasNext: false, hasPrev: 'no'})).toThrow(DevhelmError)
  })

  it('rejects null as input', () => {
    expect(() => parsePage(schemas.MonitorDto, null)).toThrow(DevhelmError)
  })

  it('rejects string as input', () => {
    expect(() => parsePage(schemas.MonitorDto, 'bad')).toThrow(DevhelmError)
  })

  it('rejects array as input', () => {
    expect(() => parsePage(schemas.MonitorDto, [validMonitorDto])).toThrow(DevhelmError)
  })

  it('rejects page with invalid item in data array', () => {
    expect(() => parsePage(schemas.MonitorDto, {
      data: [{id: 'not-uuid', name: 123}], hasNext: false, hasPrev: false,
    })).toThrow(DevhelmError)
  })

  it('accepts valid page with empty data', () => {
    const result = parsePage(schemas.MonitorDto, {data: [], hasNext: false, hasPrev: false})
    expect(result.data).toHaveLength(0)
  })

  it('accepts valid page with totalElements null', () => {
    const result = parsePage(schemas.MonitorDto, {
      data: [], hasNext: false, hasPrev: false, totalElements: null,
    })
    expect(result.totalElements).toBeNull()
  })

  it('error includes context', () => {
    try {
      parsePage(schemas.MonitorDto, {}, 'monitors.list')
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).message).toContain('monitors.list')
    }
  })
})

describe('parseCursorPage() validation layer', () => {
  it('rejects missing data field', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {hasMore: false, nextCursor: null})).toThrow(DevhelmError)
  })

  it('rejects missing hasMore', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {data: [], nextCursor: null})).toThrow(DevhelmError)
  })

  it('rejects wrong type for hasMore (string)', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {
      data: [], hasMore: 'no', nextCursor: null,
    })).toThrow(DevhelmError)
  })

  it('rejects missing nextCursor', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {data: [], hasMore: false})).toThrow(DevhelmError)
  })

  it('rejects wrong type for nextCursor (number)', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {
      data: [], hasMore: false, nextCursor: 123,
    })).toThrow(DevhelmError)
  })

  it('rejects data as non-array', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {
      data: 'bad', hasMore: false, nextCursor: null,
    })).toThrow(DevhelmError)
  })

  it('rejects null as input', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, null)).toThrow(DevhelmError)
  })

  it('rejects page with invalid item in data array', () => {
    expect(() => parseCursorPage(schemas.CheckResultDto, {
      data: [{id: 'not-uuid'}], hasMore: false, nextCursor: null,
    })).toThrow(DevhelmError)
  })

  it('accepts valid cursor page', () => {
    const result = parseCursorPage(schemas.CheckResultDto, {
      data: [validCheckResultDto], hasMore: true, nextCursor: 'abc123',
    })
    expect(result.data).toHaveLength(1)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('abc123')
  })

  it('accepts cursor page with nextCursor null', () => {
    const result = parseCursorPage(schemas.CheckResultDto, {
      data: [], hasMore: false, nextCursor: null,
    })
    expect(result.nextCursor).toBeNull()
  })

  it('error code is VALIDATION', () => {
    try {
      parseCursorPage(schemas.CheckResultDto, {})
      expect.fail('should throw')
    } catch (e) {
      expect((e as DevhelmError).code).toBe('VALIDATION')
    }
  })
})

// =====================================================================
// Cross-schema validation: nested schemas reject invalid children
// =====================================================================

describe('cross-schema negative validation', () => {
  it('MonitorVersionDto rejects snapshot with invalid type enum', () =>
    fail(schemas.MonitorVersionDto, {
      ...validMonitorVersionDto,
      snapshot: {...validMonitorDto, type: 'INVALID'},
    }))

  it('ResourceGroupDto rejects health with missing totalMembers', () => {
    const {totalMembers: _, ...badHealth} = validResourceGroupDto.health
    fail(schemas.ResourceGroupDto, {...validResourceGroupDto, health: badHealth})
  })

  it('StatusPageComponentGroupDto rejects components with invalid currentStatus', () =>
    fail(schemas.StatusPageComponentGroupDto, {
      ...validStatusPageComponentGroupDto,
      components: [{...validStatusPageComponentDto, currentStatus: 'BROKEN'}],
    }))

  it('DashboardOverviewDto rejects monitors with string total', () =>
    fail(schemas.DashboardOverviewDto, {
      ...validDashboardOverviewDto,
      monitors: {...validDashboardOverviewDto.monitors, total: 'ten'},
    }))

  it('StatusPageIncidentDto rejects updates with invalid status', () =>
    fail(schemas.StatusPageIncidentDto, {
      ...validStatusPageIncidentDto,
      updates: [{...validStatusPageIncidentUpdateDto, status: 'PANICKING'}],
    }))

  it('StatusPageIncidentDto rejects affectedComponents with invalid componentStatus', () =>
    fail(schemas.StatusPageIncidentDto, {
      ...validStatusPageIncidentDto,
      affectedComponents: [{statusPageComponentId: UUID, componentStatus: 'BROKEN', componentName: 'API'}],
    }))
})

// =====================================================================
// Edge cases: empty objects, completely wrong types
// =====================================================================

describe('edge cases — completely invalid inputs', () => {
  const dtoSchemas = [
    ['MonitorDto', schemas.MonitorDto],
    ['IncidentDto', schemas.IncidentDto],
    ['AlertChannelDto', schemas.AlertChannelDto],
    ['NotificationPolicyDto', schemas.NotificationPolicyDto],
    ['EnvironmentDto', schemas.EnvironmentDto],
    ['SecretDto', schemas.SecretDto],
    ['TagDto', schemas.TagDto],
    ['ResourceGroupDto', schemas.ResourceGroupDto],
    ['WebhookEndpointDto', schemas.WebhookEndpointDto],
    ['ApiKeyDto', schemas.ApiKeyDto],
    ['DeployLockDto', schemas.DeployLockDto],
    ['DashboardOverviewDto', schemas.DashboardOverviewDto],
    ['CheckResultDto', schemas.CheckResultDto],
    ['MonitorVersionDto', schemas.MonitorVersionDto],
    ['StatusPageDto', schemas.StatusPageDto],
    ['StatusPageComponentDto', schemas.StatusPageComponentDto],
    ['StatusPageComponentGroupDto', schemas.StatusPageComponentGroupDto],
    ['StatusPageIncidentDto', schemas.StatusPageIncidentDto],
    ['StatusPageSubscriberDto', schemas.StatusPageSubscriberDto],
    ['StatusPageCustomDomainDto', schemas.StatusPageCustomDomainDto],
    ['ServiceSubscriptionDto', schemas.ServiceSubscriptionDto],
  ] as const

  for (const [name, schema] of dtoSchemas) {
    it(`${name} rejects empty object`, () => fail(schema, {}))
    it(`${name} rejects string`, () => fail(schema, 'invalid'))
    it(`${name} rejects number`, () => fail(schema, 42))
    it(`${name} rejects boolean`, () => fail(schema, true))
    it(`${name} rejects null`, () => fail(schema, null))
    it(`${name} rejects array`, () => fail(schema, []))
  }

  const requestSchemas = [
    ['CreateMonitorRequest', schemas.CreateMonitorRequest],
    ['CreateAlertChannelRequest', schemas.CreateAlertChannelRequest],
    ['CreateNotificationPolicyRequest', schemas.CreateNotificationPolicyRequest],
    ['CreateEnvironmentRequest', schemas.CreateEnvironmentRequest],
    ['CreateSecretRequest', schemas.CreateSecretRequest],
    ['CreateTagRequest', schemas.CreateTagRequest],
    ['CreateResourceGroupRequest', schemas.CreateResourceGroupRequest],
    ['CreateWebhookEndpointRequest', schemas.CreateWebhookEndpointRequest],
    ['CreateApiKeyRequest', schemas.CreateApiKeyRequest],
    ['AcquireDeployLockRequest', schemas.AcquireDeployLockRequest],
    ['CreateManualIncidentRequest', schemas.CreateManualIncidentRequest],
    ['CreateStatusPageRequest', schemas.CreateStatusPageRequest],
    ['CreateStatusPageComponentRequest', schemas.CreateStatusPageComponentRequest],
    ['CreateStatusPageIncidentRequest', schemas.CreateStatusPageIncidentRequest],
    ['CreateStatusPageIncidentUpdateRequest', schemas.CreateStatusPageIncidentUpdateRequest],
    ['AdminAddSubscriberRequest', schemas.AdminAddSubscriberRequest],
    ['AddCustomDomainRequest', schemas.AddCustomDomainRequest],
    ['AddResourceGroupMemberRequest', schemas.AddResourceGroupMemberRequest],
  ] as const

  for (const [name, schema] of requestSchemas) {
    it(`${name} rejects string`, () => fail(schema, 'invalid'))
    it(`${name} rejects number`, () => fail(schema, 42))
    it(`${name} rejects null`, () => fail(schema, null))
    it(`${name} rejects array`, () => fail(schema, []))
  }
})

// =====================================================================
// AffectedComponent sub-schema
// =====================================================================

describe('AffectedComponent negative validation', () => {
  const s = schemas.AffectedComponent

  it('rejects missing componentId', () => fail(s, {status: 'OPERATIONAL'}))
  it('rejects non-UUID componentId', () => fail(s, {componentId: 'bad', status: 'OPERATIONAL'}))
  it('rejects missing status', () => fail(s, {componentId: UUID}))
  it('rejects invalid status enum', () => fail(s, {componentId: UUID, status: 'BROKEN'}))
  it('rejects wrong type for componentId (number)', () => fail(s, {componentId: 123, status: 'OPERATIONAL'}))
  it('rejects wrong type for status (number)', () => fail(s, {componentId: UUID, status: 42}))
})

// =====================================================================
// ComponentPosition sub-schema
// =====================================================================

describe('ComponentPosition negative validation', () => {
  const s = schemas.ComponentPosition

  it('rejects missing componentId', () => fail(s, {displayOrder: 0}))
  it('rejects non-UUID componentId', () => fail(s, {componentId: 'bad', displayOrder: 0}))
  it('rejects missing displayOrder', () => fail(s, {componentId: UUID}))
  it('rejects wrong type for displayOrder (string)', () => fail(s, {componentId: UUID, displayOrder: 'first'}))
  it('rejects non-integer displayOrder', () => fail(s, {componentId: UUID, displayOrder: 1.5}))
  it('rejects non-UUID groupId', () => fail(s, {componentId: UUID, displayOrder: 0, groupId: 'grp-bad'}))
})

// =====================================================================
// ReorderComponentsRequest
// =====================================================================

describe('ReorderComponentsRequest negative validation', () => {
  const s = schemas.ReorderComponentsRequest

  it('rejects missing positions', () => fail(s, {}))
  it('rejects empty positions array', () => fail(s, {positions: []}))
  it('rejects wrong type for positions (string)', () => fail(s, {positions: 'bad'}))
  it('rejects positions with invalid item', () =>
    fail(s, {positions: [{componentId: 'bad', displayOrder: 0}]}))
  it('rejects positions with missing displayOrder', () =>
    fail(s, {positions: [{componentId: UUID}]}))
})

// =====================================================================
// ReorderPageLayoutRequest
// =====================================================================

describe('ReorderPageLayoutRequest negative validation', () => {
  const s = schemas.ReorderPageLayoutRequest

  it('rejects missing sections', () => fail(s, {}))
  it('rejects empty sections array', () => fail(s, {sections: []}))
  it('rejects sections with missing pageOrder', () =>
    fail(s, {sections: [{groupId: UUID}]}))
  it('rejects wrong type for sections (string)', () => fail(s, {sections: 'bad'}))
  it('rejects non-integer pageOrder in sections', () =>
    fail(s, {sections: [{pageOrder: 1.5}]}))
})

// =====================================================================
// StatusPageBranding (extended negative tests)
// =====================================================================

describe('StatusPageBranding negative validation', () => {
  const s = schemas.StatusPageBranding

  it('rejects logoUrl with ftp protocol', () =>
    fail(s, {logoUrl: 'ftp://example.com/logo.png'}))

  it('rejects faviconUrl with ftp protocol', () =>
    fail(s, {faviconUrl: 'ftp://example.com/favicon.ico'}))

  it('rejects reportUrl with ftp protocol', () =>
    fail(s, {reportUrl: 'ftp://example.com/report'}))

  it('rejects brandColor with named color', () =>
    fail(s, {brandColor: 'red'}))

  it('rejects brandColor without hash', () =>
    fail(s, {brandColor: 'FF0000'}))

  it('rejects brandColor with invalid hex chars', () =>
    fail(s, {brandColor: '#GGGGGG'}))

  it('rejects pageBackground with named color', () =>
    fail(s, {pageBackground: 'white'}))

  it('rejects textColor with rgb()', () =>
    fail(s, {textColor: 'rgb(0,0,0)'}))

  it('rejects borderColor with hsl()', () =>
    fail(s, {borderColor: 'hsl(0,0%,0%)'}))

  it('rejects logoUrl longer than 2048 chars', () =>
    fail(s, {logoUrl: 'https://' + 'x'.repeat(2045)}))

  it('rejects wrong type for hidePoweredBy (string)', () =>
    fail(s, {hidePoweredBy: 'yes'}))

  it('rejects customCss longer than 50000 chars', () =>
    fail(s, {customCss: 'x'.repeat(50001)}))

  it('rejects customHeadHtml longer than 50000 chars', () =>
    fail(s, {customHeadHtml: 'x'.repeat(50001)}))

  it('rejects wrong type for logoUrl (number)', () =>
    fail(s, {logoUrl: 42}))

  it('rejects wrong type for brandColor (number)', () =>
    fail(s, {brandColor: 0xFF0000}))
})

// =====================================================================
// PublishStatusPageIncidentRequest
// =====================================================================

describe('PublishStatusPageIncidentRequest negative validation', () => {
  const s = schemas.PublishStatusPageIncidentRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for title', () => pass(s, {title: null}))
  it('accepts null for impact', () => pass(s, {impact: null}))
  it('accepts null for status', () => pass(s, {status: null}))
  it('accepts null for body', () => pass(s, {body: null}))
  it('accepts null for notifySubscribers', () => pass(s, {notifySubscribers: null}))

  it('rejects wrong type for title (number)', () => fail(s, {title: 42}))
  it('rejects title longer than 500 chars', () => fail(s, {title: 'x'.repeat(501)}))
  it('rejects invalid impact enum', () => fail(s, {impact: 'APOCALYPTIC'}))
  it('rejects invalid status enum', () => fail(s, {status: 'PANICKING'}))
  it('rejects wrong type for body (number)', () => fail(s, {body: 42}))
  it('rejects wrong type for notifySubscribers (string)', () => fail(s, {notifySubscribers: 'yes'}))

  it('rejects affectedComponents with invalid componentId', () =>
    fail(s, {affectedComponents: [{componentId: 'bad', status: 'OPERATIONAL'}]}))
})

// =====================================================================
// CreateStatusPageIncidentUpdateRequest
// =====================================================================

describe('CreateStatusPageIncidentUpdateRequest negative validation', () => {
  const s = schemas.CreateStatusPageIncidentUpdateRequest
  const valid = {status: 'INVESTIGATING', body: 'Working on it'}

  it('accepts valid request', () => pass(s, valid))

  it('rejects missing status', () => fail(s, {body: 'text'}))
  it('rejects invalid status enum', () => fail(s, {status: 'PANICKING', body: 'text'}))
  it('rejects scheduled-only statuses', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']) {
      fail(s, {status, body: 'text'})
    }
  })

  it('rejects missing body', () => fail(s, {status: 'INVESTIGATING'}))
  it('rejects empty body', () => fail(s, {status: 'INVESTIGATING', body: ''}))
  it('rejects wrong type for body (number)', () => fail(s, {status: 'INVESTIGATING', body: 42}))

  it('rejects wrong type for notifySubscribers (string)', () =>
    fail(s, {...valid, notifySubscribers: 'yes'}))
})

// =====================================================================
// TestChannelResult & WebhookTestResult
// =====================================================================

describe('TestChannelResult negative validation', () => {
  const s = schemas.TestChannelResult

  it('rejects missing success', () => fail(s, {message: 'OK'}))
  it('rejects wrong type for success (string)', () => fail(s, {success: 'yes', message: 'OK'}))
  it('rejects missing message', () => fail(s, {success: true}))
  it('rejects wrong type for message (number)', () => fail(s, {success: true, message: 42}))
  it('rejects null for success', () => fail(s, {success: null, message: 'OK'}))
  it('rejects null for message', () => fail(s, {success: true, message: null}))
})

describe('WebhookTestResult negative validation', () => {
  const s = schemas.WebhookTestResult

  it('rejects missing success', () => fail(s, {message: 'OK', statusCode: 200, durationMs: 50}))
  it('rejects wrong type for success (string)', () =>
    fail(s, {success: 'yes', message: 'OK', statusCode: 200, durationMs: 50}))
  it('rejects missing message', () => fail(s, {success: true, statusCode: 200, durationMs: 50}))
  it('rejects wrong type for message (number)', () =>
    fail(s, {success: true, message: 42, statusCode: 200, durationMs: 50}))
  it('rejects wrong type for statusCode (string)', () =>
    fail(s, {success: true, message: 'OK', statusCode: 'ok', durationMs: 50}))
  it('rejects non-integer statusCode', () =>
    fail(s, {success: true, message: 'OK', statusCode: 200.5, durationMs: 50}))
  it('rejects wrong type for durationMs (string)', () =>
    fail(s, {success: true, message: 'OK', statusCode: 200, durationMs: 'fast'}))
  it('rejects non-integer durationMs', () =>
    fail(s, {success: true, message: 'OK', statusCode: 200, durationMs: 50.5}))
})

// =====================================================================
// UpdateResourceGroupRequest
// =====================================================================

describe('UpdateResourceGroupRequest negative validation', () => {
  const s = schemas.UpdateResourceGroupRequest

  it('rejects missing name', () => fail(s, {description: 'test'}))
  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))

  it('rejects defaultFrequency below 30', () => fail(s, {name: 'test', defaultFrequency: 29}))
  it('rejects defaultFrequency above 86400', () => fail(s, {name: 'test', defaultFrequency: 86401}))
  it('rejects invalid healthThresholdType', () => fail(s, {name: 'test', healthThresholdType: 'ABSOLUTE'}))
  it('rejects healthThresholdValue below 0', () => fail(s, {name: 'test', healthThresholdValue: -1}))
  it('rejects healthThresholdValue above 100', () => fail(s, {name: 'test', healthThresholdValue: 101}))
  it('rejects non-UUID alertPolicyId', () => fail(s, {name: 'test', alertPolicyId: 'bad'}))
  it('rejects non-UUID defaultEnvironmentId', () => fail(s, {name: 'test', defaultEnvironmentId: 'bad'}))
  it('rejects confirmationDelaySeconds above 600', () => fail(s, {name: 'test', confirmationDelaySeconds: 601}))
  it('rejects recoveryCooldownMinutes above 60', () => fail(s, {name: 'test', recoveryCooldownMinutes: 61}))
})

// =====================================================================
// CreateStatusPageRequest (extended)
// =====================================================================

describe('CreateStatusPageRequest negative validation (extended)', () => {
  const s = schemas.CreateStatusPageRequest
  const valid = {name: 'Test', slug: 'test-page'}

  it('rejects missing name', () => fail(s, {slug: 'test'}))
  it('rejects missing slug', () => fail(s, {name: 'Test'}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256), slug: 'test'}))
  it('rejects slug shorter than 3 chars', () => fail(s, {name: 'Test', slug: 'ab'}))
  it('rejects slug longer than 63 chars', () => fail(s, {name: 'Test', slug: 'a'.repeat(64)}))
  it('rejects slug with uppercase', () => fail(s, {name: 'Test', slug: 'Test-Page'}))
  it('rejects slug with special chars', () => fail(s, {name: 'Test', slug: 'test!page'}))
  it('rejects slug starting with hyphen', () => fail(s, {name: 'Test', slug: '-test'}))
  it('rejects slug ending with hyphen', () => fail(s, {name: 'Test', slug: 'test-'}))

  it('rejects invalid visibility', () => fail(s, {...valid, visibility: 'PRIVATE'}))
  it('rejects invalid incidentMode', () => fail(s, {...valid, incidentMode: 'AUTO'}))
  it('rejects wrong type for enabled (string)', () => fail(s, {...valid, enabled: 'yes'}))
  it('rejects description longer than 500 chars', () => fail(s, {...valid, description: 'x'.repeat(501)}))
})

// =====================================================================
// UpdateStatusPageRequest
// =====================================================================

describe('UpdateStatusPageRequest negative validation', () => {
  const s = schemas.UpdateStatusPageRequest

  it('accepts empty object (all optional via .partial())', () => pass(s, {}))
  it('accepts null for name', () => pass(s, {name: null}))
  it('accepts null for description', () => pass(s, {description: null}))
  it('accepts null for branding', () => pass(s, {branding: null}))
  it('accepts null for visibility', () => pass(s, {visibility: null}))
  it('accepts null for enabled', () => pass(s, {enabled: null}))
  it('accepts null for incidentMode', () => pass(s, {incidentMode: null}))

  it('rejects wrong type for name (number)', () => fail(s, {name: 42}))
  it('rejects name longer than 255 chars', () => fail(s, {name: 'x'.repeat(256)}))
  it('rejects description longer than 500 chars', () => fail(s, {description: 'x'.repeat(501)}))
  it('rejects invalid visibility', () => fail(s, {visibility: 'PRIVATE'}))
  it('rejects invalid incidentMode', () => fail(s, {incidentMode: 'AUTO'}))
  it('rejects wrong type for enabled (string)', () => fail(s, {enabled: 'yes'}))
  it('rejects branding with invalid color', () => fail(s, {branding: {brandColor: 'red'}}))
})
