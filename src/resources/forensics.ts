import type {ApiClient} from '../http.js'
import type {
  IncidentTimelineDto,
  CheckTraceDto,
  PolicySnapshotDto,
  RuleEvaluationDto,
  IncidentStateTransitionDto,
  Page,
} from '../types.js'
import {
  IncidentTimelineDtoSchema,
  CheckTraceDtoSchema,
  PolicySnapshotDtoSchema,
  RuleEvaluationDtoSchema,
  IncidentStateTransitionDtoSchema,
} from '../schemas.js'
import {apiGet, fetchSingle} from '../http.js'
import {parsePage} from '../validation.js'

function formatInstant(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export interface RuleEvaluationFilters {
  ruleType?: string
  region?: string
  onlyMatched?: boolean
  from?: Date | string
  to?: Date | string
  page?: number
  size?: number
}

export interface TransitionFilters {
  from?: Date | string
  to?: Date | string
  page?: number
  size?: number
}

/**
 * Read-only forensic endpoints for detection audit trails (timelines,
 * traces, policy snapshots, rule evaluations, state transitions).
 *
 * Backed by the event-sourced forensic model described in
 * `cowork/design/046-detection-forensic-model.md`.
 */
export class Forensics {
  constructor(private readonly client: ApiClient) {}

  /** Full reconstructed timeline for an incident. */
  async incidentTimeline(id: string | number): Promise<IncidentTimelineDto> {
    return fetchSingle(
      this.client,
      'GET',
      `/api/v1/forensics/incidents/${id}/timeline`,
      IncidentTimelineDtoSchema,
    )
  }

  /** Everything recorded for a single check execution. */
  async checkTrace(checkId: string): Promise<CheckTraceDto> {
    return fetchSingle(
      this.client,
      'GET',
      `/api/v1/forensics/traces/${checkId}`,
      CheckTraceDtoSchema,
    )
  }

  /** Fetch a policy snapshot by its content-addressed SHA-256 hash. */
  async policySnapshot(hashHex: string): Promise<PolicySnapshotDto> {
    return fetchSingle(
      this.client,
      'GET',
      `/api/v1/forensics/policy-snapshots/${hashHex}`,
      PolicySnapshotDtoSchema,
    )
  }

  /** List rule evaluations produced for a monitor (paginated). */
  async monitorRuleEvaluations(
    monitorId: string | number,
    filters: RuleEvaluationFilters = {},
  ): Promise<Page<RuleEvaluationDto>> {
    const path = `/api/v1/forensics/monitors/${monitorId}/rule-evaluations`
    const query: Record<string, unknown> = {
      page: filters.page ?? 0,
      size: filters.size ?? 50,
    }
    if (filters.ruleType !== undefined) query['ruleType'] = filters.ruleType
    if (filters.region !== undefined) query['region'] = filters.region
    if (filters.onlyMatched !== undefined) query['onlyMatched'] = filters.onlyMatched
    const from = formatInstant(filters.from)
    if (from !== undefined) query['from'] = from
    const to = formatInstant(filters.to)
    if (to !== undefined) query['to'] = to

    const raw = await apiGet(this.client, path, query)
    const validated = parsePage(RuleEvaluationDtoSchema, raw, path)
    return {
      data: validated.data,
      hasNext: validated.hasNext,
      hasPrev: validated.hasPrev,
      totalElements: validated.totalElements ?? null,
      totalPages: validated.totalPages ?? null,
    }
  }

  /** List state transitions recorded for a monitor (paginated). */
  async monitorTransitions(
    monitorId: string | number,
    filters: TransitionFilters = {},
  ): Promise<Page<IncidentStateTransitionDto>> {
    const path = `/api/v1/forensics/monitors/${monitorId}/transitions`
    const query: Record<string, unknown> = {
      page: filters.page ?? 0,
      size: filters.size ?? 50,
    }
    const from = formatInstant(filters.from)
    if (from !== undefined) query['from'] = from
    const to = formatInstant(filters.to)
    if (to !== undefined) query['to'] = to

    const raw = await apiGet(this.client, path, query)
    const validated = parsePage(IncidentStateTransitionDtoSchema, raw, path)
    return {
      data: validated.data,
      hasNext: validated.hasNext,
      hasPrev: validated.hasPrev,
      totalElements: validated.totalElements ?? null,
      totalPages: validated.totalPages ?? null,
    }
  }
}
