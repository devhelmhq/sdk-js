import type {z} from 'zod'
import type {components, paths} from './generated/api.js'
import type * as S from './schemas.js'
import type {JsonObject, Wire} from './json.js'

export type Schemas = components['schemas']

// ── Response DTOs ──────────────────────────────────────────────────────

type MonitorDtoBase = Wire<z.infer<typeof S.MonitorDtoSchema>>

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
export type IncidentDto = Wire<z.infer<typeof S.IncidentDtoSchema>>
export type IncidentDetailDto = Wire<z.infer<typeof S.IncidentDetailDtoSchema>>
export type AlertChannelDto = Wire<z.infer<typeof S.AlertChannelDtoSchema>>
export type NotificationPolicyDto = Wire<z.infer<typeof S.NotificationPolicyDtoSchema>>
export type EnvironmentDto = Wire<z.infer<typeof S.EnvironmentDtoSchema>>
export type SecretDto = Wire<z.infer<typeof S.SecretDtoSchema>>
export type TagDto = Wire<z.infer<typeof S.TagDtoSchema>>
export type ResourceGroupDto = Wire<z.infer<typeof S.ResourceGroupDtoSchema>>
export type WebhookEndpointDto = Wire<z.infer<typeof S.WebhookEndpointDtoSchema>>
export type ApiKeyDto = Wire<z.infer<typeof S.ApiKeyDtoSchema>>
export type ApiKeyCreateResponse = Wire<z.infer<typeof S.ApiKeyCreateResponseSchema>>
export type ServiceSubscriptionDto = Wire<z.infer<typeof S.ServiceSubscriptionDtoSchema>>
export type MonitorVersionDto = Wire<z.infer<typeof S.MonitorVersionDtoSchema>>
export type CheckResultDto = Wire<z.infer<typeof S.CheckResultDtoSchema>>
export type DashboardOverviewDto = Wire<z.infer<typeof S.DashboardOverviewDtoSchema>>
export type DeployLockDto = Wire<z.infer<typeof S.DeployLockDtoSchema>>
export type AssertionTestResultDto = Wire<z.infer<typeof S.AssertionTestResultDtoSchema>>
export type MonitorTestResultDto = Wire<z.infer<typeof S.MonitorTestResultDtoSchema>>
/** A monitor run (queued, running, or finished). */
export type RunDto = Wire<z.infer<typeof S.RunDtoSchema>>

export type MaintenanceWindowDto = Wire<z.infer<typeof S.MaintenanceWindowDtoSchema>>

// ── Status Data catalog DTOs ──────────────────────────────────────────

export type ServiceCatalogDto = Wire<z.infer<typeof S.ServiceCatalogDtoSchema>>
export type ServiceDetailDto = Wire<z.infer<typeof S.ServiceDetailDtoSchema>>
export type ServiceLiveStatusDto = Wire<z.infer<typeof S.ServiceLiveStatusDtoSchema>>
export type ServiceStatusDto = Wire<z.infer<typeof S.ServiceStatusDtoSchema>>
export type CategoryDto = Wire<z.infer<typeof S.CategoryDtoSchema>>
export type GlobalStatusSummaryDto = Wire<z.infer<typeof S.GlobalStatusSummaryDtoSchema>>
export type ServiceComponentDto = Wire<z.infer<typeof S.ServiceComponentDtoSchema>>
export type ComponentStatusDto = Wire<z.infer<typeof S.ComponentStatusDtoSchema>>
export type ComponentsSummaryDto = Wire<z.infer<typeof S.ComponentsSummaryDtoSchema>>
export type ComponentUptimeSummaryDto = Wire<z.infer<typeof S.ComponentUptimeSummaryDtoSchema>>
export type ComponentUptimeDayDto = Wire<z.infer<typeof S.ComponentUptimeDayDtoSchema>>
export type BatchComponentUptimeDto = Wire<z.infer<typeof S.BatchComponentUptimeDtoSchema>>
export type ServiceDayDetailDto = Wire<z.infer<typeof S.ServiceDayDetailDtoSchema>>
export type ServiceIncidentDto = Wire<z.infer<typeof S.ServiceIncidentDtoSchema>>
export type ServiceIncidentDetailDto = Wire<z.infer<typeof S.ServiceIncidentDetailDtoSchema>>
export type ServiceIncidentUpdateDto = Wire<z.infer<typeof S.ServiceIncidentUpdateDtoSchema>>
export type ServiceUptimeResponse = Wire<z.infer<typeof S.ServiceUptimeResponseSchema>>
export type UptimeBucketDto = Wire<z.infer<typeof S.UptimeBucketDtoSchema>>
export type ScheduledMaintenanceDto = Wire<z.infer<typeof S.ScheduledMaintenanceDtoSchema>>

// ── Forensic DTOs ─────────────────────────────────────────────────────

export type IncidentTimelineDto = Wire<z.infer<typeof S.IncidentTimelineDtoSchema>>
export type CheckTraceDto = Wire<z.infer<typeof S.CheckTraceDtoSchema>>
export type PolicySnapshotDto = Wire<z.infer<typeof S.PolicySnapshotDtoSchema>>
export type RuleEvaluationDto = Wire<z.infer<typeof S.RuleEvaluationDtoSchema>>
export type IncidentStateTransitionDto = Wire<z.infer<typeof S.IncidentStateTransitionDtoSchema>>

// ── Status Page DTOs ──────────────────────────────────────────────────

export type StatusPageDto = Wire<z.infer<typeof S.StatusPageDtoSchema>>
export type StatusPageComponentDto = Wire<z.infer<typeof S.StatusPageComponentDtoSchema>>
export type StatusPageComponentGroupDto = Wire<z.infer<typeof S.StatusPageComponentGroupDtoSchema>>
export type StatusPageIncidentDto = Wire<z.infer<typeof S.StatusPageIncidentDtoSchema>>
export type StatusPageIncidentUpdateDto = Wire<z.infer<typeof S.StatusPageIncidentUpdateDtoSchema>>
export type StatusPageIncidentComponentDto = Wire<z.infer<typeof S.StatusPageIncidentComponentDtoSchema>>
export type StatusPageSubscriberDto = Wire<z.infer<typeof S.StatusPageSubscriberDtoSchema>>
export type StatusPageCustomDomainDto = Wire<z.infer<typeof S.StatusPageCustomDomainDtoSchema>>
export type StatusPageBranding = Wire<z.infer<typeof S.StatusPageBrandingSchema>>

// ── Request types ──────────────────────────────────────────────────────

export type CreateMonitorRequest = Wire<z.infer<typeof S.CreateMonitorRequestSchema>>
export type UpdateMonitorRequest = Wire<z.infer<typeof S.UpdateMonitorRequestSchema>>
/** Optional target for `monitors.testRun()`: environment and region of the validation run. */
export type CodeTestTargetRequest = Wire<z.infer<typeof S.CodeTestTargetRequestSchema>>
export type CreateManualIncidentRequest = Wire<z.infer<typeof S.CreateManualIncidentRequestSchema>>
export type ResolveIncidentRequest = Wire<z.infer<typeof S.ResolveIncidentRequestSchema>>
export type CreateAlertChannelRequest = Wire<z.infer<typeof S.CreateAlertChannelRequestSchema>>
export type UpdateAlertChannelRequest = Wire<z.infer<typeof S.UpdateAlertChannelRequestSchema>>
export type CreateNotificationPolicyRequest = Wire<z.infer<typeof S.CreateNotificationPolicyRequestSchema>>
export type UpdateNotificationPolicyRequest = Wire<z.infer<typeof S.UpdateNotificationPolicyRequestSchema>>
export type CreateEnvironmentRequest = Wire<z.infer<typeof S.CreateEnvironmentRequestSchema>>
export type UpdateEnvironmentRequest = Wire<z.infer<typeof S.UpdateEnvironmentRequestSchema>>
export type CreateSecretRequest = Wire<z.infer<typeof S.CreateSecretRequestSchema>>
export type UpdateSecretRequest = Wire<z.infer<typeof S.UpdateSecretRequestSchema>>
export type CreateTagRequest = Wire<z.infer<typeof S.CreateTagRequestSchema>>
export type UpdateTagRequest = Wire<z.infer<typeof S.UpdateTagRequestSchema>>
export type CreateResourceGroupRequest = Wire<z.infer<typeof S.CreateResourceGroupRequestSchema>>
export type UpdateResourceGroupRequest = Wire<z.infer<typeof S.UpdateResourceGroupRequestSchema>>
export type AddResourceGroupMemberRequest = Wire<z.infer<typeof S.AddResourceGroupMemberRequestSchema>>
export type CreateWebhookEndpointRequest = Wire<z.infer<typeof S.CreateWebhookEndpointRequestSchema>>
export type UpdateWebhookEndpointRequest = Wire<z.infer<typeof S.UpdateWebhookEndpointRequestSchema>>
export type WebhookInboxDto = Wire<z.infer<typeof S.WebhookInboxDtoSchema>>
export type WebhookEventDto = Wire<z.infer<typeof S.WebhookEventDtoSchema>>
export type CreateWebhookInboxRequest = Wire<z.infer<typeof S.CreateWebhookInboxRequestSchema>>
export type UpdateWebhookInboxRequest = Wire<z.infer<typeof S.UpdateWebhookInboxRequestSchema>>
export type EmailDomainDto = Wire<z.infer<typeof S.EmailDomainDtoSchema>>
export type EmailMessageDto = Wire<z.infer<typeof S.EmailMessageDtoSchema>>
export type SignedDownload = Wire<z.infer<typeof S.SignedDownloadSchema>>
export type InjectEmailMessageResponse = Wire<z.infer<typeof S.InjectEmailMessageResponseSchema>>
export type CreateEmailDomainRequest = Wire<z.infer<typeof S.CreateEmailDomainRequestSchema>>
export type UpdateEmailDomainRequest = Wire<z.infer<typeof S.UpdateEmailDomainRequestSchema>>
export type InboundOtpCode = Wire<z.infer<typeof S.InboundOtpCodeSchema>>
export type InboundEmailLink = Wire<z.infer<typeof S.InboundEmailLinkSchema>>
export type InboundEmailAttachment = Wire<z.infer<typeof S.InboundEmailAttachmentSchema>>
export type CreateApiKeyRequest = Wire<z.infer<typeof S.CreateApiKeyRequestSchema>>
export type AcquireDeployLockRequest = Wire<z.infer<typeof S.AcquireDeployLockRequestSchema>>
export type CreateMaintenanceWindowRequest = Wire<z.infer<typeof S.CreateMaintenanceWindowRequestSchema>>
export type UpdateMaintenanceWindowRequest = Wire<z.infer<typeof S.UpdateMaintenanceWindowRequestSchema>>
export type ServiceSubscribeRequest = Wire<z.infer<typeof S.ServiceSubscribeRequestSchema>>
export type UpdateAlertSensitivityRequest = Wire<z.infer<typeof S.UpdateAlertSensitivityRequestSchema>>

// ── Status Page Request types ─────────────────────────────────────────

export type CreateStatusPageRequest = Wire<z.infer<typeof S.CreateStatusPageRequestSchema>>
export type UpdateStatusPageRequest = Wire<z.infer<typeof S.UpdateStatusPageRequestSchema>>
export type CreateStatusPageComponentRequest = Wire<z.infer<typeof S.CreateStatusPageComponentRequestSchema>>
export type UpdateStatusPageComponentRequest = Wire<z.infer<typeof S.UpdateStatusPageComponentRequestSchema>>
export type CreateStatusPageComponentGroupRequest = Wire<z.infer<typeof S.CreateStatusPageComponentGroupRequestSchema>>
export type UpdateStatusPageComponentGroupRequest = Wire<z.infer<typeof S.UpdateStatusPageComponentGroupRequestSchema>>
export type CreateStatusPageIncidentRequest = Wire<z.infer<typeof S.CreateStatusPageIncidentRequestSchema>>
export type CreateStatusPageMaintenanceRequest = Wire<z.infer<typeof S.CreateStatusPageMaintenanceRequestSchema>>
export type UpdateStatusPageIncidentRequest = Wire<z.infer<typeof S.UpdateStatusPageIncidentRequestSchema>>
export type CreateStatusPageIncidentUpdateRequest = Wire<z.infer<typeof S.CreateStatusPageIncidentUpdateRequestSchema>>
export type AddCustomDomainRequest = Wire<z.infer<typeof S.AddCustomDomainRequestSchema>>
export type AdminAddSubscriberRequest = Wire<z.infer<typeof S.AdminAddSubscriberRequestSchema>>
export type PublishStatusPageIncidentRequest = Wire<z.infer<typeof S.PublishStatusPageIncidentRequestSchema>>
export type ReorderComponentsRequest = Wire<z.infer<typeof S.ReorderComponentsRequestSchema>>
export type ReorderPageLayoutRequest = Wire<z.infer<typeof S.ReorderPageLayoutRequestSchema>>
export type ComponentPosition = Wire<z.infer<typeof S.ComponentPositionSchema>>
export type AffectedComponent = Wire<z.infer<typeof S.AffectedComponentSchema>>

// ── Misc response types ──────────────────────────────────────────────

export type TestChannelResult = Wire<z.infer<typeof S.TestChannelResultSchema>>
export type WebhookTestResult = Wire<z.infer<typeof S.WebhookTestResultSchema>>
export type ErrorResponse = Wire<z.infer<typeof S.ErrorResponseSchema>>

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
  /**
   * API token (Bearer). When omitted: `DEVHELM_API_TOKEN`, then the current
   * `devhelm auth login` context (Node only). None of them → `ValidationError`
   * with code `NO_TOKEN`.
   */
  token?: string
  /** Base URL for the DevHelm API. Defaults to `DEVHELM_API_URL`, the CLI context, then https://api.devhelm.io */
  baseUrl?: string
  /** Organization ID header. Defaults to env DEVHELM_ORG_ID or "1". */
  orgId?: string
  /** Workspace ID header. Set this, or DEVHELM_WORKSPACE_ID, when the organization has more than one workspace. */
  workspaceId?: string
  /**
   * `X-DevHelm-Client` value, `<surface>/<version>`. Defaults to
   * `sdk-js/<version>`. The API records it as who created a revision;
   * wrappers set their own (`cli/1.30.0`, `mcp/0.9.0`).
   */
  client?: string
  /** Retry policy for 429, 503 and retryable 409s (default: 5 attempts, waits up to 30 s). */
  retry?: {maxAttempts?: number; maxDelayMs?: number}
  /**
   * Idempotency key for a POST. Default: a random UUID per logical call,
   * reused only by its retries. A CLI passes a key derived from its CI run.
   */
  idempotencyKey?: (call: {method: string; url: string; sequence: number}) => string | null | undefined
  /** `fetch` implementation (default: the global one). */
  fetch?: (request: Request) => Promise<Response>
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

// ── Synthetics: bundles, revisions, runs, runtimes, usage ──────────

export type BundleDto = Wire<z.infer<typeof S.BundleDtoSchema>>
export type BundleCheckResultDto = Wire<z.infer<typeof S.BundleCheckResultDtoSchema>>
export type CreateBundleRequest = Wire<z.infer<typeof S.CreateBundleRequestSchema>>
/** `code` on create / update / draft: the uploaded bundle digest and its entrypoint. */
export type MonitorCodeSpec = Wire<z.infer<typeof S.MonitorCodeSpecSchema>>
export type CodeSource = Wire<z.infer<typeof S.CodeSourceSchema>>
export type RevisionDto = Wire<z.infer<typeof S.RevisionDtoSchema>>
export type RevisionDiffDto = Wire<z.infer<typeof S.RevisionDiffDtoSchema>>
export type RevisionFilesDto = Wire<z.infer<typeof S.RevisionFilesDtoSchema>>
export type CreateDraftRevisionRequest = Wire<z.infer<typeof S.CreateDraftRevisionRequestSchema>>
export type CreateDraftRevisionResponse = Wire<z.infer<typeof S.CreateDraftRevisionResponseSchema>>
export type DefinitionHeadDto = Wire<z.infer<typeof S.DefinitionHeadDtoSchema>>
export type PublishRevisionRequest = Wire<z.infer<typeof S.PublishRevisionRequestSchema>>
export type RollbackRevisionRequest = Wire<z.infer<typeof S.RollbackRevisionRequestSchema>>
export type RollbackPreviewDto = Wire<z.infer<typeof S.RollbackPreviewDtoSchema>>
export type TransferMonitorRequest = Wire<z.infer<typeof S.TransferMonitorRequestSchema>>
export type TakeoverMonitorRequest = Wire<z.infer<typeof S.TakeoverMonitorRequestSchema>>
export type MonitorDriftDto = Wire<z.infer<typeof S.MonitorDriftDtoSchema>>
export type MonitorOverlayRequest = Wire<z.infer<typeof S.MonitorOverlayRequestSchema>>
export type QuarantineMonitorRequest = Wire<z.infer<typeof S.QuarantineMonitorRequestSchema>>
export type RestoreMonitorRequest = Wire<z.infer<typeof S.RestoreMonitorRequestSchema>>
export type MonitorHistoryEntryDto = Wire<z.infer<typeof S.MonitorHistoryEntryDtoSchema>>
export type TriggerRunRequest = Wire<z.infer<typeof S.TriggerRunRequestSchema>>
export type TriggerRunsResponse = Wire<z.infer<typeof S.TriggerRunsResponseSchema>>
export type MonitorTestRequest = Wire<z.infer<typeof S.MonitorTestRequestSchema>>
export type RunSessionContext = Wire<z.infer<typeof S.RunSessionContextSchema>>
export type RuntimeProfileDto = Wire<z.infer<typeof S.RuntimeProfileDtoSchema>>
/** One run control event. `payload` is free-form JSON (the spec declares object values; phase payloads carry strings). */
export type RunEventDto = Omit<Wire<z.infer<typeof S.RunEventDtoSchema>>, 'payload'> & {payload: JsonObject}
export type RunCaseDto = Wire<z.infer<typeof S.RunCaseDtoSchema>>
export type RunConsoleDto = Wire<z.infer<typeof S.RunConsoleDtoSchema>>
export type RunNetworkDto = Wire<z.infer<typeof S.RunNetworkDtoSchema>>
export type NetworkRowDto = Wire<z.infer<typeof S.NetworkRowDtoSchema>>
export type RunArtifactDto = Wire<z.infer<typeof S.RunArtifactDtoSchema>>
export type ArtifactDownloadDto = Wire<z.infer<typeof S.ArtifactDownloadDtoSchema>>
export type RunTraceSummaryDto = Wire<z.infer<typeof S.RunTraceSummaryDtoSchema>>
export type RunDiffDto = Wire<z.infer<typeof S.RunDiffDtoSchema>>
export type RunMetricsSummaryDto = Wire<z.infer<typeof S.RunMetricsSummaryDtoSchema>>
export type RunSkippedEntryDto = Wire<z.infer<typeof S.RunSkippedEntryDtoSchema>>
export type EvidencePurgeRequest = Wire<z.infer<typeof S.EvidencePurgeRequestSchema>>
export type SecretUsageDto = Wire<z.infer<typeof S.SecretUsageDtoSchema>>
export type MonitorSecretRequestsDto = Wire<z.infer<typeof S.MonitorSecretRequestsDtoSchema>>
export type RemapSecretRequest = Wire<z.infer<typeof S.RemapSecretRequestSchema>>
export type MonitorSessionDto = Wire<z.infer<typeof S.MonitorSessionDtoSchema>>
export type UpsertMonitorSessionRequest = Wire<z.infer<typeof S.UpsertMonitorSessionRequestSchema>>
export type SyntheticsUsagePeriodDto = Wire<z.infer<typeof S.SyntheticsUsagePeriodDtoSchema>>
export type EntitlementResponse = Wire<z.infer<typeof S.EntitlementResponseSchema>>
export type AuthMeResponse = Wire<z.infer<typeof S.AuthMeResponseSchema>>
export type AuditEventDto = Wire<z.infer<typeof S.AuditEventDtoSchema>>
export type ValidateMonitorsRequest = Wire<z.infer<typeof S.ValidateMonitorsRequestSchema>>
export type MonitorValidationResultDto = Wire<z.infer<typeof S.MonitorValidationResultDtoSchema>>
export type MonitorUsageProjectionDto = Wire<z.infer<typeof S.MonitorUsageProjectionDtoSchema>>
export type UpdateIncidentRequest = Wire<z.infer<typeof S.UpdateIncidentRequestSchema>>
export type AddIncidentUpdateRequest = Wire<z.infer<typeof S.AddIncidentUpdateRequestSchema>>
export type AcknowledgeAllIncidentsResponse = Wire<z.infer<typeof S.AcknowledgeAllIncidentsResponseSchema>>
export type RelatedIncidentsResponse = Wire<z.infer<typeof S.RelatedIncidentsResponseSchema>>
export type IncidentActivityEventDto = Wire<z.infer<typeof S.IncidentActivityEventDtoSchema>>
export type IncidentTriggerDto = Wire<z.infer<typeof S.IncidentTriggerDtoSchema>>
export type SetStatusPageComponentOverrideRequest = Wire<z.infer<typeof S.SetStatusPageComponentOverrideRequestSchema>>
export type UpdateStatusPageIncidentUpdateRequest = Wire<z.infer<typeof S.UpdateStatusPageIncidentUpdateRequestSchema>>
export type RegionDto = Wire<z.infer<typeof S.RegionDtoSchema>>
export type ScriptMonitorConfig = Wire<z.infer<typeof S.ScriptMonitorConfigSchema>>

/** Query parameters of a route, from the generated spec types. */
type RouteQuery<P extends keyof paths, M extends 'get' | 'post'> = paths[P][M] extends {parameters: {query?: infer Q}}
  ? NonNullable<Q> extends {params: infer Params}
    ? Params
    : Omit<NonNullable<Q>, 'pageable' | 'triage'>
  : never

/** `runs.list()` filters (`GET /api/v1/runs`). */
export type RunListFilter = Partial<RouteQuery<'/api/v1/runs', 'get'>>
/** `GET /api/v1/monitors/{id}/runs` filters. */
export type MonitorRunListFilter = Partial<RouteQuery<'/api/v1/monitors/{id}/runs', 'get'>>
/** `runs.console()` options. */
export type RunConsoleFilter = Partial<RouteQuery<'/api/v1/runs/{id}/console', 'get'>>
/** `runs.network()` options. */
export type RunNetworkFilter = Partial<RouteQuery<'/api/v1/runs/{id}/network', 'get'>>
/** `runs.steps()` options. */
export type RunCaseFilter = Partial<RouteQuery<'/api/v1/runs/{id}/cases', 'get'>>
/** `runs.skipped()` filters. */
export type RunSkippedFilter = Partial<RouteQuery<'/api/v1/runs/skipped', 'get'>>
/** `audit.list()` filters. */
export type AuditLogFilter = Partial<RouteQuery<'/api/v1/audit-log', 'get'>>
/** `incidents.list()` filters. */
export type IncidentFilter = Partial<RouteQuery<'/api/v1/incidents', 'get'>>
/** `monitors.list()` filters as the API names them. */
export type MonitorListQuery = Partial<RouteQuery<'/api/v1/monitors', 'get'>>
