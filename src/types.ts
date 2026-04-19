import type {z} from 'zod'
import type {components} from './generated/api.js'
import type * as S from './schemas.js'

export type Schemas = components['schemas']

// ── Response DTOs ──────────────────────────────────────────────────────

export type MonitorDto = z.infer<typeof S.MonitorDtoSchema>
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

// ── Status Page Request types ─────────────────────────────────────────

export type CreateStatusPageRequest = z.infer<typeof S.CreateStatusPageRequestSchema>
export type UpdateStatusPageRequest = z.infer<typeof S.UpdateStatusPageRequestSchema>
export type CreateStatusPageComponentRequest = z.infer<typeof S.CreateStatusPageComponentRequestSchema>
export type UpdateStatusPageComponentRequest = z.infer<typeof S.UpdateStatusPageComponentRequestSchema>
export type CreateStatusPageComponentGroupRequest = z.infer<typeof S.CreateStatusPageComponentGroupRequestSchema>
export type UpdateStatusPageComponentGroupRequest = z.infer<typeof S.UpdateStatusPageComponentGroupRequestSchema>
export type CreateStatusPageIncidentRequest = z.infer<typeof S.CreateStatusPageIncidentRequestSchema>
export type UpdateStatusPageIncidentRequest = z.infer<typeof S.UpdateStatusPageIncidentRequestSchema>
export type CreateStatusPageIncidentUpdateRequest = z.infer<typeof S.CreateStatusPageIncidentUpdateRequestSchema>
export type AddCustomDomainRequest = z.infer<typeof S.AddCustomDomainRequestSchema>
export type AdminAddSubscriberRequest = z.infer<typeof S.AdminAddSubscriberRequestSchema>
export type PublishStatusPageIncidentRequest = z.infer<typeof S.PublishStatusPageIncidentRequestSchema>
export type ReorderComponentsRequest = z.infer<typeof S.ReorderComponentsRequestSchema>
export type ComponentPosition = z.infer<typeof S.ComponentPositionSchema>
export type AffectedComponent = z.infer<typeof S.AffectedComponentSchema>

// ── Misc response types ──────────────────────────────────────────────

export type TestChannelResult = z.infer<typeof S.TestChannelResultSchema>
export type WebhookTestResult = z.infer<typeof S.WebhookTestResultSchema>

// ── Pagination ─────────────────────────────────────────────────────────

export interface Page<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
  totalElements: number | null
  totalPages: number | null
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
}
