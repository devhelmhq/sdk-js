import type {z} from 'zod'
import type {components} from './generated/api.js'
import type * as S from './schemas.js'

export type Schemas = components['schemas']

// ── Response DTOs ──────────────────────────────────────────────────────

type MonitorDtoBase = z.infer<typeof S.MonitorDtoSchema>

/**
 * Full monitor representation returned by GET, POST, and PUT endpoints.
 *
 * `currentStatus` is the derived health of the monitor (e.g. `"up"`,
 * `"degraded"`, `"down"`). It is populated after the first probe runs —
 * typically ~1 minute after create — so on a freshly-created monitor it
 * may be `null` or `undefined`. Always provide a fallback when displaying
 * it, e.g. `monitor.currentStatus ?? 'PENDING'`.
 */
export type MonitorDto = MonitorDtoBase & {
  /**
   * Populated after the first probe (~1 minute after create). May be
   * null or undefined immediately after create.
   */
  currentStatus?: string | null
}
export type IncidentDto = z.infer<typeof S.IncidentDtoSchema>
export type IncidentDetailDto = z.infer<typeof S.IncidentDetailDtoSchema>
export type AlertChannelDto = z.infer<typeof S.AlertChannelDtoSchema>
export type NotificationPolicyDto = z.infer<typeof S.NotificationPolicyDtoSchema>
export type EnvironmentDto = z.infer<typeof S.EnvironmentDtoSchema>
export type SecretDto = z.infer<typeof S.SecretDtoSchema>
export type TagDto = z.infer<typeof S.TagDtoSchema>
export type ResourceGroupDto = z.infer<typeof S.ResourceGroupDtoSchema>
export type WebhookEndpointDto = z.infer<typeof S.WebhookEndpointDtoSchema>
export type ApiKeyDto = z.infer<typeof S.ApiKeyDtoSchema>
export type ApiKeyCreateResponse = z.infer<typeof S.ApiKeyCreateResponseSchema>
export type ServiceSubscriptionDto = z.infer<typeof S.ServiceSubscriptionDtoSchema>
export type MonitorVersionDto = z.infer<typeof S.MonitorVersionDtoSchema>
export type CheckResultDto = z.infer<typeof S.CheckResultDtoSchema>
export type DashboardOverviewDto = z.infer<typeof S.DashboardOverviewDtoSchema>
export type DeployLockDto = z.infer<typeof S.DeployLockDtoSchema>
export type AssertionTestResultDto = z.infer<typeof S.AssertionTestResultDtoSchema>
export type MonitorTestResultDto = z.infer<typeof S.MonitorTestResultDtoSchema>
export type MaintenanceWindowDto = z.infer<typeof S.MaintenanceWindowDtoSchema>

// ── Status Data catalog DTOs ──────────────────────────────────────────

export type ServiceCatalogDto = z.infer<typeof S.ServiceCatalogDtoSchema>
export type ServiceDetailDto = z.infer<typeof S.ServiceDetailDtoSchema>
export type ServiceLiveStatusDto = z.infer<typeof S.ServiceLiveStatusDtoSchema>
export type ServiceStatusDto = z.infer<typeof S.ServiceStatusDtoSchema>
export type CategoryDto = z.infer<typeof S.CategoryDtoSchema>
export type GlobalStatusSummaryDto = z.infer<typeof S.GlobalStatusSummaryDtoSchema>
export type ServiceComponentDto = z.infer<typeof S.ServiceComponentDtoSchema>
export type ComponentStatusDto = z.infer<typeof S.ComponentStatusDtoSchema>
export type ComponentsSummaryDto = z.infer<typeof S.ComponentsSummaryDtoSchema>
export type ComponentUptimeSummaryDto = z.infer<typeof S.ComponentUptimeSummaryDtoSchema>
export type ComponentUptimeDayDto = z.infer<typeof S.ComponentUptimeDayDtoSchema>
export type BatchComponentUptimeDto = z.infer<typeof S.BatchComponentUptimeDtoSchema>
export type ServiceDayDetailDto = z.infer<typeof S.ServiceDayDetailDtoSchema>
export type ServiceIncidentDto = z.infer<typeof S.ServiceIncidentDtoSchema>
export type ServiceIncidentDetailDto = z.infer<typeof S.ServiceIncidentDetailDtoSchema>
export type ServiceIncidentUpdateDto = z.infer<typeof S.ServiceIncidentUpdateDtoSchema>
export type ServiceUptimeResponse = z.infer<typeof S.ServiceUptimeResponseSchema>
export type UptimeBucketDto = z.infer<typeof S.UptimeBucketDtoSchema>
export type ScheduledMaintenanceDto = z.infer<typeof S.ScheduledMaintenanceDtoSchema>

// ── Forensic DTOs ─────────────────────────────────────────────────────

export type IncidentTimelineDto = z.infer<typeof S.IncidentTimelineDtoSchema>
export type CheckTraceDto = z.infer<typeof S.CheckTraceDtoSchema>
export type PolicySnapshotDto = z.infer<typeof S.PolicySnapshotDtoSchema>
export type RuleEvaluationDto = z.infer<typeof S.RuleEvaluationDtoSchema>
export type IncidentStateTransitionDto = z.infer<typeof S.IncidentStateTransitionDtoSchema>

// ── Status Page DTOs ──────────────────────────────────────────────────

export type StatusPageDto = z.infer<typeof S.StatusPageDtoSchema>
export type StatusPageComponentDto = z.infer<typeof S.StatusPageComponentDtoSchema>
export type StatusPageComponentGroupDto = z.infer<typeof S.StatusPageComponentGroupDtoSchema>
export type StatusPageIncidentDto = z.infer<typeof S.StatusPageIncidentDtoSchema>
export type StatusPageIncidentUpdateDto = z.infer<typeof S.StatusPageIncidentUpdateDtoSchema>
export type StatusPageIncidentComponentDto = z.infer<typeof S.StatusPageIncidentComponentDtoSchema>
export type StatusPageSubscriberDto = z.infer<typeof S.StatusPageSubscriberDtoSchema>
export type StatusPageCustomDomainDto = z.infer<typeof S.StatusPageCustomDomainDtoSchema>
export type StatusPageBranding = z.infer<typeof S.StatusPageBrandingSchema>

// ── Request types ──────────────────────────────────────────────────────

export type CreateMonitorRequest = z.infer<typeof S.CreateMonitorRequestSchema>
export type UpdateMonitorRequest = z.infer<typeof S.UpdateMonitorRequestSchema>
export type CreateManualIncidentRequest = z.infer<typeof S.CreateManualIncidentRequestSchema>
export type ResolveIncidentRequest = z.infer<typeof S.ResolveIncidentRequestSchema>
export type CreateAlertChannelRequest = z.infer<typeof S.CreateAlertChannelRequestSchema>
export type UpdateAlertChannelRequest = z.infer<typeof S.UpdateAlertChannelRequestSchema>
export type CreateNotificationPolicyRequest = z.infer<typeof S.CreateNotificationPolicyRequestSchema>
export type UpdateNotificationPolicyRequest = z.infer<typeof S.UpdateNotificationPolicyRequestSchema>
export type CreateEnvironmentRequest = z.infer<typeof S.CreateEnvironmentRequestSchema>
export type UpdateEnvironmentRequest = z.infer<typeof S.UpdateEnvironmentRequestSchema>
export type CreateSecretRequest = z.infer<typeof S.CreateSecretRequestSchema>
export type UpdateSecretRequest = z.infer<typeof S.UpdateSecretRequestSchema>
export type CreateTagRequest = z.infer<typeof S.CreateTagRequestSchema>
export type UpdateTagRequest = z.infer<typeof S.UpdateTagRequestSchema>
export type CreateResourceGroupRequest = z.infer<typeof S.CreateResourceGroupRequestSchema>
export type UpdateResourceGroupRequest = z.infer<typeof S.UpdateResourceGroupRequestSchema>
export type AddResourceGroupMemberRequest = z.infer<typeof S.AddResourceGroupMemberRequestSchema>
export type CreateWebhookEndpointRequest = z.infer<typeof S.CreateWebhookEndpointRequestSchema>
export type UpdateWebhookEndpointRequest = z.infer<typeof S.UpdateWebhookEndpointRequestSchema>
export type CreateApiKeyRequest = z.infer<typeof S.CreateApiKeyRequestSchema>
export type AcquireDeployLockRequest = z.infer<typeof S.AcquireDeployLockRequestSchema>
export type CreateMaintenanceWindowRequest = z.infer<typeof S.CreateMaintenanceWindowRequestSchema>
export type UpdateMaintenanceWindowRequest = z.infer<typeof S.UpdateMaintenanceWindowRequestSchema>
export type ServiceSubscribeRequest = z.infer<typeof S.ServiceSubscribeRequestSchema>
export type UpdateAlertSensitivityRequest = z.infer<typeof S.UpdateAlertSensitivityRequestSchema>

// ── Status Page Request types ─────────────────────────────────────────

export type CreateStatusPageRequest = z.infer<typeof S.CreateStatusPageRequestSchema>
export type UpdateStatusPageRequest = z.infer<typeof S.UpdateStatusPageRequestSchema>
export type CreateStatusPageComponentRequest = z.infer<typeof S.CreateStatusPageComponentRequestSchema>
export type UpdateStatusPageComponentRequest = z.infer<typeof S.UpdateStatusPageComponentRequestSchema>
export type CreateStatusPageComponentGroupRequest = z.infer<typeof S.CreateStatusPageComponentGroupRequestSchema>
export type UpdateStatusPageComponentGroupRequest = z.infer<typeof S.UpdateStatusPageComponentGroupRequestSchema>
export type CreateStatusPageIncidentRequest = z.infer<typeof S.CreateStatusPageIncidentRequestSchema>
export type CreateStatusPageMaintenanceRequest = z.infer<typeof S.CreateStatusPageMaintenanceRequestSchema>
export type UpdateStatusPageIncidentRequest = z.infer<typeof S.UpdateStatusPageIncidentRequestSchema>
export type CreateStatusPageIncidentUpdateRequest = z.infer<typeof S.CreateStatusPageIncidentUpdateRequestSchema>
export type AddCustomDomainRequest = z.infer<typeof S.AddCustomDomainRequestSchema>
export type AdminAddSubscriberRequest = z.infer<typeof S.AdminAddSubscriberRequestSchema>
export type PublishStatusPageIncidentRequest = z.infer<typeof S.PublishStatusPageIncidentRequestSchema>
export type ReorderComponentsRequest = z.infer<typeof S.ReorderComponentsRequestSchema>
export type ReorderPageLayoutRequest = z.infer<typeof S.ReorderPageLayoutRequestSchema>
export type ComponentPosition = z.infer<typeof S.ComponentPositionSchema>
export type AffectedComponent = z.infer<typeof S.AffectedComponentSchema>

// ── Misc response types ──────────────────────────────────────────────

export type TestChannelResult = z.infer<typeof S.TestChannelResultSchema>
export type WebhookTestResult = z.infer<typeof S.WebhookTestResultSchema>
export type ErrorResponse = z.infer<typeof S.ErrorResponseSchema>

// ── Pagination ─────────────────────────────────────────────────────────

export interface Page<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
  totalElements: number | null
  totalPages: number | null
  nextCursor?: string | null
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

// ── Client configuration ───────────────────────────────────────────────

export interface DevhelmConfig {
  /** API token (Bearer). Required. */
  token: string
  /** Base URL for the DevHelm API. Defaults to https://api.devhelm.io */
  baseUrl?: string
  /** Organization ID header. Defaults to env DEVHELM_ORG_ID or "1". */
  orgId?: string
  /** Workspace ID header. Defaults to env DEVHELM_WORKSPACE_ID or "1". */
  workspaceId?: string
  /**
   * Devtool surface identifier reported to the API for adoption / version
   * telemetry. Defaults to `"sdk-js"`. Wrappers (a CLI, an MCP server, a
   * custom SDK build) can override this so their traffic is attributed
   * correctly. End users of the SDK should leave it unset.
   * See https://devhelm.io/telemetry for the wire contract and opt-out.
   */
  surface?: string
  /** Surface version. Defaults to the installed `@devhelm/sdk` package version. */
  surfaceVersion?: string
  /**
   * Surface-specific metadata forwarded as `X-DevHelm-<key>` headers
   * (e.g. an MCP wrapper might attach `{ "Mcp-Client": "cursor" }`).
   */
  surfaceMetadata?: Record<string, string>
}
