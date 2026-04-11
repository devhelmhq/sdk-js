import type {components} from './generated/api.js'

export type Schemas = components['schemas']

// ── Response DTOs ──────────────────────────────────────────────────────

export type MonitorDto = Schemas['MonitorDto']
export type IncidentDto = Schemas['IncidentDto']
export type IncidentDetailDto = Schemas['IncidentDetailDto']
export type AlertChannelDto = Schemas['AlertChannelDto']
export type NotificationPolicyDto = Schemas['NotificationPolicyDto']
export type EnvironmentDto = Schemas['EnvironmentDto']
export type SecretDto = Schemas['SecretDto']
export type TagDto = Schemas['TagDto']
export type ResourceGroupDto = Schemas['ResourceGroupDto']
export type WebhookEndpointDto = Schemas['WebhookEndpointDto']
export type ApiKeyDto = Schemas['ApiKeyDto']
export type ApiKeyCreateResponse = Schemas['ApiKeyCreateResponse']
export type ServiceSubscriptionDto = Schemas['ServiceSubscriptionDto']
export type MonitorVersionDto = Schemas['MonitorVersionDto']
export type CheckResultDto = Schemas['CheckResultDto']
export type DashboardOverviewDto = Schemas['DashboardOverviewDto']
export type DeployLockDto = Schemas['DeployLockDto']
export type AssertionTestResultDto = Schemas['AssertionTestResultDto']

// ── Request types ──────────────────────────────────────────────────────

export type CreateMonitorRequest = Schemas['CreateMonitorRequest']
export type UpdateMonitorRequest = Schemas['UpdateMonitorRequest']
export type CreateManualIncidentRequest = Schemas['CreateManualIncidentRequest']
export type CreateAlertChannelRequest = Schemas['CreateAlertChannelRequest']
export type UpdateAlertChannelRequest = Schemas['UpdateAlertChannelRequest']
export type CreateNotificationPolicyRequest = Schemas['CreateNotificationPolicyRequest']
export type UpdateNotificationPolicyRequest = Schemas['UpdateNotificationPolicyRequest']
export type CreateEnvironmentRequest = Schemas['CreateEnvironmentRequest']
export type UpdateEnvironmentRequest = Schemas['UpdateEnvironmentRequest']
export type CreateSecretRequest = Schemas['CreateSecretRequest']
export type UpdateSecretRequest = Schemas['UpdateSecretRequest']
export type CreateTagRequest = Schemas['CreateTagRequest']
export type UpdateTagRequest = Schemas['UpdateTagRequest']
export type CreateResourceGroupRequest = Schemas['CreateResourceGroupRequest']
export type UpdateResourceGroupRequest = Schemas['UpdateResourceGroupRequest']
export type CreateWebhookEndpointRequest = Schemas['CreateWebhookEndpointRequest']
export type UpdateWebhookEndpointRequest = Schemas['UpdateWebhookEndpointRequest']
export type CreateApiKeyRequest = Schemas['CreateApiKeyRequest']
export type AcquireDeployLockRequest = Schemas['AcquireDeployLockRequest']

// ── Pagination ─────────────────────────────────────────────────────────

export interface Page<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
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
