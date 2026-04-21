import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {schemas} from '../src/schemas.js'
import {DevhelmError} from '../src/errors.js'
import {parse, parseSingle, parsePage} from '../src/validation.js'

// ── Fixture helpers ─────────────────────────────────────────────────

const validBranding = {
  logoUrl: null, faviconUrl: null,
  brandColor: null, pageBackground: null, cardBackground: null,
  textColor: null, borderColor: null,
  headerStyle: null, theme: null, reportUrl: null,
  hidePoweredBy: false, customCss: null, customHeadHtml: null,
}

const validStatusPageDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  organizationId: 1, workspaceId: 1,
  name: 'Test Page', slug: 'test-page',
  description: null, branding: validBranding,
  visibility: 'PUBLIC', enabled: true,
  incidentMode: 'MANUAL',
  componentCount: 0, subscriberCount: 0,
  overallStatus: 'OPERATIONAL',
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

const validIncidentDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  statusPageId: '550e8400-e29b-41d4-a716-446655440001',
  title: 'Outage', status: 'INVESTIGATING', impact: 'MAJOR',
  scheduled: false,
  scheduledFor: null, scheduledUntil: null,
  autoResolve: false, incidentId: null,
  startedAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-01T00:00:00Z',
  resolvedAt: null,
  createdByUserId: null,
  postmortemBody: null, postmortemUrl: null,
  updates: [], affectedComponents: [],
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

const validComponentDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  statusPageId: '550e8400-e29b-41d4-a716-446655440001',
  groupId: null, name: 'API', description: null,
  type: 'STATIC', monitorId: null, resourceGroupId: null,
  currentStatus: 'OPERATIONAL',
  showUptime: true, displayOrder: 0, pageOrder: 0,
  excludeFromOverall: false, startDate: null,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

// ── Schema existence checks ────────────────────────────────────────

describe('generated schemas exist and are Zod schemas', () => {
  const requiredSchemas = [
    'MonitorDto', 'IncidentDto', 'IncidentDetailDto',
    'AlertChannelDto', 'NotificationPolicyDto',
    'EnvironmentDto', 'SecretDto', 'TagDto',
    'ResourceGroupDto', 'WebhookEndpointDto',
    'ApiKeyDto', 'ApiKeyCreateResponse',
    'ServiceSubscriptionDto', 'MonitorVersionDto',
    'CheckResultDto', 'DashboardOverviewDto', 'DeployLockDto',
    'StatusPageDto', 'StatusPageComponentDto', 'StatusPageComponentGroupDto',
    'StatusPageIncidentDto', 'StatusPageSubscriberDto', 'StatusPageCustomDomainDto',
    'CreateMonitorRequest', 'UpdateMonitorRequest',
    'CreateStatusPageRequest', 'UpdateStatusPageRequest',
    'CreateStatusPageComponentRequest', 'UpdateStatusPageComponentRequest',
    'CreateStatusPageIncidentRequest', 'UpdateStatusPageIncidentRequest',
    'CreateStatusPageIncidentUpdateRequest', 'PublishStatusPageIncidentRequest',
    'AdminAddSubscriberRequest', 'AddCustomDomainRequest',
    'ReorderComponentsRequest', 'ComponentPosition', 'AffectedComponent',
    'TestChannelResult', 'WebhookTestResult',
  ] as const

  for (const name of requiredSchemas) {
    it(`schemas.${name} exists and is a ZodType`, () => {
      const schema = schemas[name]
      expect(schema).toBeDefined()
      expect(schema).toBeInstanceOf(z.ZodType)
    })
  }
})

// ── Request schema validation ──────────────────────────────────────

describe('CreateStatusPageRequest validation', () => {
  const schema = schemas.CreateStatusPageRequest

  it('accepts valid request', () => {
    expect(schema.safeParse({name: 'My Page', slug: 'my-page'}).success).toBe(true)
  })

  it('rejects missing name', () => {
    expect(schema.safeParse({slug: 'my-page'}).success).toBe(false)
  })

  it('rejects missing slug', () => {
    expect(schema.safeParse({name: 'Test'}).success).toBe(false)
  })

  it('rejects slug with uppercase', () => {
    expect(schema.safeParse({name: 'Test', slug: 'My-Page'}).success).toBe(false)
  })

  it('rejects slug shorter than 3 chars', () => {
    expect(schema.safeParse({name: 'Test', slug: 'ab'}).success).toBe(false)
  })

  it('rejects slug with special chars', () => {
    expect(schema.safeParse({name: 'Test', slug: 'my_page!'}).success).toBe(false)
  })

  it('accepts valid visibility enum', () => {
    expect(schema.safeParse({name: 'Test', slug: 'test-page', visibility: 'PUBLIC'}).success).toBe(true)
  })

  it('rejects invalid visibility enum value', () => {
    expect(schema.safeParse({name: 'Test', slug: 'test-page', visibility: 'PRIVATE'}).success).toBe(false)
  })

  it('accepts valid incidentMode enum', () => {
    expect(schema.safeParse({name: 'Test', slug: 'test-page', incidentMode: 'MANUAL'}).success).toBe(true)
  })

  it('rejects invalid incidentMode', () => {
    expect(schema.safeParse({name: 'Test', slug: 'test-page', incidentMode: 'AUTO'}).success).toBe(false)
  })
})

describe('CreateStatusPageComponentRequest validation', () => {
  const schema = schemas.CreateStatusPageComponentRequest

  it('accepts valid STATIC component', () => {
    expect(schema.safeParse({name: 'API', type: 'STATIC'}).success).toBe(true)
  })

  it('rejects missing type', () => {
    expect(schema.safeParse({name: 'API'}).success).toBe(false)
  })

  it('rejects invalid type enum', () => {
    expect(schema.safeParse({name: 'API', type: 'KUBERNETES'}).success).toBe(false)
  })

  it('accepts monitorId as UUID', () => {
    expect(schema.safeParse({
      name: 'API', type: 'MONITOR',
      monitorId: '550e8400-e29b-41d4-a716-446655440000',
    }).success).toBe(true)
  })

  it('rejects monitorId with invalid UUID', () => {
    expect(schema.safeParse({name: 'API', type: 'MONITOR', monitorId: 'not-a-uuid'}).success).toBe(false)
  })
})

describe('CreateStatusPageIncidentRequest validation', () => {
  const schema = schemas.CreateStatusPageIncidentRequest

  it('accepts valid incident', () => {
    expect(schema.safeParse({
      title: 'Database outage', impact: 'MAJOR',
      body: 'Investigating database connectivity issues',
    }).success).toBe(true)
  })

  it('rejects missing title', () => {
    expect(schema.safeParse({impact: 'MAJOR', body: 'test'}).success).toBe(false)
  })

  it('rejects missing impact', () => {
    expect(schema.safeParse({title: 'test', body: 'test'}).success).toBe(false)
  })

  it('rejects invalid impact enum', () => {
    expect(schema.safeParse({title: 'test', impact: 'APOCALYPTIC', body: 'test'}).success).toBe(false)
  })

  it('rejects missing body', () => {
    expect(schema.safeParse({title: 'test', impact: 'MAJOR'}).success).toBe(false)
  })

  it('rejects empty body', () => {
    expect(schema.safeParse({title: 'test', impact: 'MAJOR', body: ''}).success).toBe(false)
  })
})

describe('AdminAddSubscriberRequest validation', () => {
  const schema = schemas.AdminAddSubscriberRequest

  it('accepts valid email', () => {
    expect(schema.safeParse({email: 'user@example.com'}).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(schema.safeParse({email: 'not-an-email'}).success).toBe(false)
  })

  it('rejects missing email', () => {
    expect(schema.safeParse({}).success).toBe(false)
  })
})

describe('AddCustomDomainRequest validation', () => {
  const schema = schemas.AddCustomDomainRequest

  it('accepts valid hostname', () => {
    expect(schema.safeParse({hostname: 'status.example.com'}).success).toBe(true)
  })

  it('rejects hostname without dots (single label)', () => {
    expect(schema.safeParse({hostname: 'localhost'}).success).toBe(false)
  })

  it('rejects hostname with uppercase', () => {
    expect(schema.safeParse({hostname: 'Status.Example.com'}).success).toBe(false)
  })

  it('rejects empty hostname', () => {
    expect(schema.safeParse({hostname: ''}).success).toBe(false)
  })
})

describe('ReorderComponentsRequest validation', () => {
  const schema = schemas.ReorderComponentsRequest

  it('accepts valid positions', () => {
    expect(schema.safeParse({
      positions: [{componentId: '550e8400-e29b-41d4-a716-446655440000', displayOrder: 0}],
    }).success).toBe(true)
  })

  it('rejects empty positions array', () => {
    expect(schema.safeParse({positions: []}).success).toBe(false)
  })

  it('rejects positions with non-UUID componentId', () => {
    expect(schema.safeParse({
      positions: [{componentId: 'abc', displayOrder: 0}],
    }).success).toBe(false)
  })
})

describe('CreateStatusPageIncidentUpdateRequest validation', () => {
  const schema = schemas.CreateStatusPageIncidentUpdateRequest

  it('accepts valid update', () => {
    expect(schema.safeParse({body: 'Root cause found', status: 'IDENTIFIED'}).success).toBe(true)
  })

  it('rejects missing body', () => {
    expect(schema.safeParse({status: 'IDENTIFIED'}).success).toBe(false)
  })

  it('rejects missing status', () => {
    expect(schema.safeParse({body: 'update text'}).success).toBe(false)
  })

  it('rejects invalid status enum', () => {
    expect(schema.safeParse({body: 'text', status: 'PANICKING'}).success).toBe(false)
  })

  it('accepts all valid status enums', () => {
    for (const status of ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED']) {
      expect(schema.safeParse({body: 'text', status}).success).toBe(true)
    }
  })

  it('rejects scheduled-only statuses (those belong on the incident, not updates)', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']) {
      expect(schema.safeParse({body: 'text', status}).success).toBe(false)
    }
  })
})

// ── Response DTO schema validation ──────────────────────────────────

describe('StatusPageDto response validation', () => {
  const schema = schemas.StatusPageDto

  it('accepts valid DTO', () => {
    expect(schema.safeParse(validStatusPageDto).success).toBe(true)
  })

  it('rejects missing required id', () => {
    const {id: _, ...noId} = validStatusPageDto
    expect(schema.safeParse(noId).success).toBe(false)
  })

  it('rejects non-UUID id', () => {
    expect(schema.safeParse({...validStatusPageDto, id: 'not-uuid'}).success).toBe(false)
  })

  it('rejects invalid visibility enum in response', () => {
    expect(schema.safeParse({...validStatusPageDto, visibility: 'HIDDEN'}).success).toBe(false)
  })

  it('rejects missing name', () => {
    const {name: _, ...noName} = validStatusPageDto
    expect(schema.safeParse(noName).success).toBe(false)
  })

  it('rejects missing branding', () => {
    const {branding: _, ...noBranding} = validStatusPageDto
    expect(schema.safeParse(noBranding).success).toBe(false)
  })

  it('accepts branding with all optional fields omitted', () => {
    expect(schema.safeParse({...validStatusPageDto, branding: {}}).success).toBe(true)
  })

  it('accepts branding with color values', () => {
    const dto = {
      ...validStatusPageDto,
      branding: {...validBranding, brandColor: '#FF0000', textColor: '#333333'},
    }
    expect(schema.safeParse(dto).success).toBe(true)
  })

  it('rejects branding with invalid color format', () => {
    const dto = {
      ...validStatusPageDto,
      branding: {...validBranding, brandColor: 'red'},
    }
    expect(schema.safeParse(dto).success).toBe(false)
  })
})

describe('StatusPageComponentDto response validation', () => {
  const schema = schemas.StatusPageComponentDto

  it('accepts valid component DTO', () => {
    expect(schema.safeParse(validComponentDto).success).toBe(true)
  })

  it('rejects invalid currentStatus', () => {
    expect(schema.safeParse({...validComponentDto, currentStatus: 'BROKEN'}).success).toBe(false)
  })

  it('validates all currentStatus enum values', () => {
    for (const status of ['OPERATIONAL', 'DEGRADED_PERFORMANCE', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'UNDER_MAINTENANCE']) {
      expect(schema.safeParse({...validComponentDto, currentStatus: status}).success).toBe(true)
    }
  })
})

describe('StatusPageIncidentDto response validation', () => {
  const schema = schemas.StatusPageIncidentDto

  it('accepts valid incident DTO', () => {
    expect(schema.safeParse(validIncidentDto).success).toBe(true)
  })

  it('rejects incident with missing scheduled field', () => {
    const {scheduled: _, ...noScheduled} = validIncidentDto
    expect(schema.safeParse(noScheduled).success).toBe(false)
  })

  it('rejects incident with invalid status', () => {
    expect(schema.safeParse({...validIncidentDto, status: 'OPEN'}).success).toBe(false)
  })

  it('accepts incident with all nullable fields null', () => {
    expect(schema.safeParse({
      ...validIncidentDto,
      scheduledFor: null, scheduledUntil: null,
      incidentId: null, resolvedAt: null,
      createdByUserId: null, postmortemBody: null, postmortemUrl: null,
      affectedComponents: null, updates: null,
    }).success).toBe(true)
  })
})

// ── Envelope parsing tests (real schema + validation layer) ─────────

describe('parseSingle with real schemas', () => {
  it('validates StatusPageDto through envelope', () => {
    const result = parseSingle(schemas.StatusPageDto, {data: validStatusPageDto})
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(result.slug).toBe('test-page')
  })

  it('throws when StatusPageDto response has wrong type for field', () => {
    expect(() => parseSingle(schemas.StatusPageDto, {data: {id: 123, name: 'test'}})).toThrow(DevhelmError)
  })

  it('error includes specific field path', () => {
    try {
      parseSingle(schemas.StatusPageDto, {data: {id: 'bad', name: 123}})
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(DevhelmError)
      expect((e as DevhelmError).message).toMatch(/data\.id/)
    }
  })
})

describe('parsePage with real schemas', () => {
  it('validates paginated StatusPageIncidentDto', () => {
    const raw = {
      data: [validIncidentDto],
      hasNext: false, hasPrev: false,
      totalElements: 1, totalPages: 1,
    }
    const result = parsePage(schemas.StatusPageIncidentDto, raw)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].title).toBe('Outage')
    expect(result.totalElements).toBe(1)
  })

  it('throws when a page item has invalid impact enum', () => {
    const raw = {
      data: [{...validIncidentDto, impact: 'APOCALYPTIC'}],
      hasNext: false, hasPrev: false,
    }
    expect(() => parsePage(schemas.StatusPageIncidentDto, raw)).toThrow(DevhelmError)
  })
})

// ── Test result schemas ─────────────────────────────────────────────

describe('WebhookTestResult schema', () => {
  it('accepts full result with all fields', () => {
    expect(schemas.WebhookTestResult.safeParse({
      success: true, statusCode: 200, message: 'OK', durationMs: 150,
    }).success).toBe(true)
  })

  it('accepts result with nullable fields null', () => {
    expect(schemas.WebhookTestResult.safeParse({
      success: false, statusCode: null, message: 'Connection refused', durationMs: null,
    }).success).toBe(true)
  })

  it('rejects when success field is missing', () => {
    expect(schemas.WebhookTestResult.safeParse({statusCode: 200, message: 'OK', durationMs: 50}).success).toBe(false)
  })

  it('rejects when message field is missing', () => {
    expect(schemas.WebhookTestResult.safeParse({success: true, statusCode: 200, durationMs: 50}).success).toBe(false)
  })
})

describe('TestChannelResult schema', () => {
  it('accepts valid result with both fields', () => {
    expect(schemas.TestChannelResult.safeParse({success: true, message: 'Sent'}).success).toBe(true)
  })

  it('rejects when message is missing', () => {
    expect(schemas.TestChannelResult.safeParse({success: true}).success).toBe(false)
  })

  it('rejects non-boolean success', () => {
    expect(schemas.TestChannelResult.safeParse({success: 'yes', message: 'OK'}).success).toBe(false)
  })
})

// ── Enum exhaustiveness tests ───────────────────────────────────────

describe('enum validation rejects unknown values', () => {
  it('visibility rejects UNLISTED', () => {
    expect(schemas.CreateStatusPageRequest.safeParse({
      name: 'Test', slug: 'test-page', visibility: 'UNLISTED',
    }).success).toBe(false)
  })

  it('component type rejects SERVICE', () => {
    expect(schemas.CreateStatusPageComponentRequest.safeParse({
      name: 'Test', type: 'SERVICE',
    }).success).toBe(false)
  })

  it('incident impact accepts all valid values', () => {
    for (const impact of ['NONE', 'MINOR', 'MAJOR', 'CRITICAL']) {
      expect(schemas.CreateStatusPageIncidentRequest.safeParse({
        title: 'Test', impact, body: 'text',
      }).success).toBe(true)
    }
  })
})

// ── Strict objects (no passthrough on generated DTOs) ──────────────
// Generated schemas emit `.strict()` so unknown fields are REJECTED
// (not silently stripped). This catches API schema drift at the parse
// boundary instead of allowing new server-side fields to vanish into
// consumer code that hasn't been updated yet.

describe('strict object schemas reject unknown fields', () => {
  it('StatusPageDto rejects unknown fields on parse', () => {
    const raw = {...validStatusPageDto, futureField: 'new-api-version-data'}
    const result = schemas.StatusPageDto.safeParse(raw)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('unrecognized_keys')
    }
  })
})

// ── Cross-schema references ─────────────────────────────────────────

describe('cross-schema type references', () => {
  it('StatusPageComponentGroupDto contains StatusPageComponentDto array', () => {
    const raw = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      statusPageId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Infrastructure', description: null,
      displayOrder: 0, pageOrder: 0, collapsed: false,
      components: [validComponentDto],
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    }
    const result = schemas.StatusPageComponentGroupDto.safeParse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.components![0].name).toBe('API')
    }
  })

  it('rejects group with invalid nested component', () => {
    const raw = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      statusPageId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Infra', description: null,
      displayOrder: 0, pageOrder: 0, collapsed: false,
      components: [{id: 'not-uuid', name: 'Bad'}],
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    }
    expect(schemas.StatusPageComponentGroupDto.safeParse(raw).success).toBe(false)
  })
})

// ── Pagination envelope schemas ─────────────────────────────────────

describe('TableValueResult schemas', () => {
  it('validates page structure', () => {
    const raw = {
      data: [validStatusPageDto],
      hasNext: false, hasPrev: false,
      totalElements: 1, totalPages: 1,
    }
    expect(schemas.TableValueResultStatusPageDto.safeParse(raw).success).toBe(true)
  })

  it('includes totalElements and totalPages', () => {
    const result = schemas.TableValueResultStatusPageDto.safeParse({
      data: [], hasNext: false, hasPrev: false,
      totalElements: 42, totalPages: 3,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalElements).toBe(42)
      expect(result.data.totalPages).toBe(3)
    }
  })

  it('rejects missing hasNext', () => {
    expect(schemas.TableValueResultStatusPageDto.safeParse({
      data: [], hasPrev: false, totalElements: 0, totalPages: 0,
    }).success).toBe(false)
  })
})

// ── SingleValueResponse envelope schemas ────────────────────────────

describe('SingleValueResponse schemas', () => {
  it('wraps DTO in data envelope', () => {
    const result = schemas.SingleValueResponseStatusPageDto.safeParse({
      data: validStatusPageDto,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data.name).toBe('Test Page')
    }
  })

  it('rejects when data field contains wrong type', () => {
    expect(schemas.SingleValueResponseStatusPageDto.safeParse({data: 'string'}).success).toBe(false)
  })
})

// ── Branding validation (detailed) ──────────────────────────────────

describe('StatusPageBranding schema', () => {
  it('accepts full branding with all defaults null', () => {
    expect(schemas.StatusPageBranding.safeParse(validBranding).success).toBe(true)
  })

  it('accepts branding with valid hex colors', () => {
    expect(schemas.StatusPageBranding.safeParse({
      ...validBranding,
      brandColor: '#FF0000',
      textColor: '#333',
      borderColor: '#AABBCCDD',
    }).success).toBe(true)
  })

  it('rejects branding with named color', () => {
    expect(schemas.StatusPageBranding.safeParse({
      ...validBranding, brandColor: 'red',
    }).success).toBe(false)
  })

  it('rejects branding with malformed hex', () => {
    expect(schemas.StatusPageBranding.safeParse({
      ...validBranding, brandColor: '#GG0000',
    }).success).toBe(false)
  })

  it('accepts valid logo URL', () => {
    expect(schemas.StatusPageBranding.safeParse({
      ...validBranding, logoUrl: 'https://example.com/logo.png',
    }).success).toBe(true)
  })

  it('rejects non-http logo URL', () => {
    expect(schemas.StatusPageBranding.safeParse({
      ...validBranding, logoUrl: 'ftp://example.com/logo.png',
    }).success).toBe(false)
  })
})
