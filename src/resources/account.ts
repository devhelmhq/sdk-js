import type {ApiClient} from '../http.js'
import {fetchSingle, fetchTable} from '../http.js'
import type {AuditEventDto, AuditLogFilter, AuthMeResponse, EntitlementResponse, Page, SyntheticsUsagePeriodDto} from '../types.js'
import {AuditEventDtoSchema, AuthMeResponseSchema, EntitlementResponseSchema, SyntheticsUsagePeriodDtoSchema} from '../schemas.js'

/** The caller's key, plan, entitlements and synthetics usage. */
export class Account {
  constructor(private readonly client: ApiClient) {}

  /** Synthetics runs used this period (`GET /synthetics/usage`). */
  async usage(): Promise<SyntheticsUsagePeriodDto> {
    return fetchSingle(this.client, 'GET', '/api/v1/synthetics/usage', SyntheticsUsagePeriodDtoSchema)
  }

  /** Plan limits and features (`GET /entitlements`). */
  async entitlements(): Promise<EntitlementResponse> {
    return fetchSingle(this.client, 'GET', '/api/v1/entitlements', EntitlementResponseSchema)
  }

  /** The key, organization, plan and rate limits behind this token (`GET /auth/me`). */
  async me(): Promise<AuthMeResponse> {
    return fetchSingle(this.client, 'GET', '/api/v1/auth/me', AuthMeResponseSchema)
  }
}

/** The audit log. */
export class Audit {
  constructor(private readonly client: ApiClient) {}

  /** One page of audit events (`GET /audit-log`). */
  async list(filter: AuditLogFilter = {}): Promise<Page<AuditEventDto>> {
    return fetchTable(this.client, '/api/v1/audit-log', AuditEventDtoSchema, filter)
  }
}
