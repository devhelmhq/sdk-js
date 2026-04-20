/**
 * Bridge file: re-exports generated Zod schemas from the OpenAPI codegen.
 *
 * Import schemas from here — never from generated/schemas.ts directly.
 * This mirrors the dashboard's apiSchemas.ts bridge pattern.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — generated file has @ts-nocheck
import {schemas} from './generated/schemas.js'
export {schemas}

import {z} from 'zod'

// ── Response DTO schemas ────────────────────────────────────────────

export const MonitorDtoSchema = schemas.MonitorDto
export const IncidentDtoSchema = schemas.IncidentDto
export const IncidentDetailDtoSchema = schemas.IncidentDetailDto
export const AlertChannelDtoSchema = schemas.AlertChannelDto
export const NotificationPolicyDtoSchema = schemas.NotificationPolicyDto
export const EnvironmentDtoSchema = schemas.EnvironmentDto
export const SecretDtoSchema = schemas.SecretDto
export const TagDtoSchema = schemas.TagDto
export const ResourceGroupDtoSchema = schemas.ResourceGroupDto
export const WebhookEndpointDtoSchema = schemas.WebhookEndpointDto
export const ApiKeyDtoSchema = schemas.ApiKeyDto
export const ApiKeyCreateResponseSchema = schemas.ApiKeyCreateResponse
export const ServiceSubscriptionDtoSchema = schemas.ServiceSubscriptionDto
export const MonitorVersionDtoSchema = schemas.MonitorVersionDto
export const CheckResultDtoSchema = schemas.CheckResultDto
export const DashboardOverviewDtoSchema = schemas.DashboardOverviewDto
export const DeployLockDtoSchema = schemas.DeployLockDto
export const AssertionTestResultDtoSchema = schemas.AssertionTestResultDto
export const MonitorTestResultDtoSchema = schemas.MonitorTestResultDto

// ── Status Page DTO schemas ─────────────────────────────────────────

export const StatusPageDtoSchema = schemas.StatusPageDto
export const StatusPageComponentDtoSchema = schemas.StatusPageComponentDto
export const StatusPageComponentGroupDtoSchema = schemas.StatusPageComponentGroupDto
export const StatusPageIncidentDtoSchema = schemas.StatusPageIncidentDto
export const StatusPageIncidentUpdateDtoSchema = schemas.StatusPageIncidentUpdateDto
export const StatusPageIncidentComponentDtoSchema = schemas.StatusPageIncidentComponentDto
export const StatusPageSubscriberDtoSchema = schemas.StatusPageSubscriberDto
export const StatusPageCustomDomainDtoSchema = schemas.StatusPageCustomDomainDto
export const StatusPageBrandingSchema = schemas.StatusPageBranding

// ── Request schemas ─────────────────────────────────────────────────

export const CreateMonitorRequestSchema = schemas.CreateMonitorRequest
export const UpdateMonitorRequestSchema = schemas.UpdateMonitorRequest
export const CreateManualIncidentRequestSchema = schemas.CreateManualIncidentRequest
export const ResolveIncidentRequestSchema = schemas.ResolveIncidentRequest
export const CreateAlertChannelRequestSchema = schemas.CreateAlertChannelRequest
export const UpdateAlertChannelRequestSchema = schemas.UpdateAlertChannelRequest
export const CreateNotificationPolicyRequestSchema = schemas.CreateNotificationPolicyRequest
export const UpdateNotificationPolicyRequestSchema = schemas.UpdateNotificationPolicyRequest
export const CreateEnvironmentRequestSchema = schemas.CreateEnvironmentRequest
export const UpdateEnvironmentRequestSchema = schemas.UpdateEnvironmentRequest
export const CreateSecretRequestSchema = schemas.CreateSecretRequest
export const UpdateSecretRequestSchema = schemas.UpdateSecretRequest
export const CreateTagRequestSchema = schemas.CreateTagRequest
export const UpdateTagRequestSchema = schemas.UpdateTagRequest
export const CreateResourceGroupRequestSchema = schemas.CreateResourceGroupRequest
export const UpdateResourceGroupRequestSchema = schemas.UpdateResourceGroupRequest
export const AddResourceGroupMemberRequestSchema = schemas.AddResourceGroupMemberRequest
export const CreateWebhookEndpointRequestSchema = schemas.CreateWebhookEndpointRequest
export const UpdateWebhookEndpointRequestSchema = schemas.UpdateWebhookEndpointRequest
export const CreateApiKeyRequestSchema = schemas.CreateApiKeyRequest
export const AcquireDeployLockRequestSchema = schemas.AcquireDeployLockRequest

// ── Status Page Request schemas ─────────────────────────────────────

export const CreateStatusPageRequestSchema = schemas.CreateStatusPageRequest
export const UpdateStatusPageRequestSchema = schemas.UpdateStatusPageRequest
export const CreateStatusPageComponentRequestSchema = schemas.CreateStatusPageComponentRequest
export const UpdateStatusPageComponentRequestSchema = schemas.UpdateStatusPageComponentRequest
export const CreateStatusPageComponentGroupRequestSchema = schemas.CreateStatusPageComponentGroupRequest
export const UpdateStatusPageComponentGroupRequestSchema = schemas.UpdateStatusPageComponentGroupRequest
export const CreateStatusPageIncidentRequestSchema = schemas.CreateStatusPageIncidentRequest
export const UpdateStatusPageIncidentRequestSchema = schemas.UpdateStatusPageIncidentRequest
export const CreateStatusPageIncidentUpdateRequestSchema = schemas.CreateStatusPageIncidentUpdateRequest
export const PublishStatusPageIncidentRequestSchema = schemas.PublishStatusPageIncidentRequest
export const AddCustomDomainRequestSchema = schemas.AddCustomDomainRequest
export const AdminAddSubscriberRequestSchema = schemas.AdminAddSubscriberRequest
export const ReorderComponentsRequestSchema = schemas.ReorderComponentsRequest
export const ComponentPositionSchema = schemas.ComponentPosition
export const AffectedComponentSchema = schemas.AffectedComponent
export const ReorderPageLayoutRequestSchema = schemas.ReorderPageLayoutRequest

// ── Envelope / Pagination schemas ───────────────────────────────────

export const TestChannelResultSchema = schemas.TestChannelResult
export const WebhookTestResultSchema = schemas.WebhookTestResult

// SingleValueResponse wrappers
export const SingleValueResponseMonitorDtoSchema = schemas.SingleValueResponseMonitorDto
export const SingleValueResponseIncidentDetailDtoSchema = schemas.SingleValueResponseIncidentDetailDto
export const SingleValueResponseAlertChannelDtoSchema = schemas.SingleValueResponseAlertChannelDto
export const SingleValueResponseNotificationPolicyDtoSchema = schemas.SingleValueResponseNotificationPolicyDto
export const SingleValueResponseEnvironmentDtoSchema = schemas.SingleValueResponseEnvironmentDto
export const SingleValueResponseSecretDtoSchema = schemas.SingleValueResponseSecretDto
export const SingleValueResponseTagDtoSchema = schemas.SingleValueResponseTagDto
export const SingleValueResponseResourceGroupDtoSchema = schemas.SingleValueResponseResourceGroupDto
export const SingleValueResponseWebhookEndpointDtoSchema = schemas.SingleValueResponseWebhookEndpointDto
export const SingleValueResponseApiKeyDtoSchema = schemas.SingleValueResponseApiKeyDto
export const SingleValueResponseApiKeyCreateResponseSchema = schemas.SingleValueResponseApiKeyCreateResponse
export const SingleValueResponseServiceSubscriptionDtoSchema = schemas.SingleValueResponseServiceSubscriptionDto
export const SingleValueResponseDashboardOverviewDtoSchema = schemas.SingleValueResponseDashboardOverviewDto
export const SingleValueResponseDeployLockDtoSchema = schemas.SingleValueResponseDeployLockDto
export const SingleValueResponseMonitorTestResultDtoSchema = schemas.SingleValueResponseMonitorTestResultDto
export const SingleValueResponseStatusPageDtoSchema = schemas.SingleValueResponseStatusPageDto
export const SingleValueResponseStatusPageComponentDtoSchema = schemas.SingleValueResponseStatusPageComponentDto
export const SingleValueResponseStatusPageComponentGroupDtoSchema = schemas.SingleValueResponseStatusPageComponentGroupDto
export const SingleValueResponseStatusPageIncidentDtoSchema = schemas.SingleValueResponseStatusPageIncidentDto
export const SingleValueResponseStatusPageSubscriberDtoSchema = schemas.SingleValueResponseStatusPageSubscriberDto
export const SingleValueResponseStatusPageCustomDomainDtoSchema = schemas.SingleValueResponseStatusPageCustomDomainDto
export const SingleValueResponseTestChannelResultSchema = schemas.SingleValueResponseTestChannelResult
export const SingleValueResponseWebhookTestResultSchema = schemas.SingleValueResponseWebhookTestResult
export const SingleValueResponseResourceGroupMemberDtoSchema = schemas.SingleValueResponseResourceGroupMemberDto

// TableValueResult (paginated) wrappers
export const TableValueResultMonitorDtoSchema = schemas.TableValueResultMonitorDto
export const TableValueResultIncidentDtoSchema = schemas.TableValueResultIncidentDto
export const TableValueResultAlertChannelDtoSchema = schemas.TableValueResultAlertChannelDto
export const TableValueResultNotificationPolicyDtoSchema = schemas.TableValueResultNotificationPolicyDto
export const TableValueResultEnvironmentDtoSchema = schemas.TableValueResultEnvironmentDto
export const TableValueResultSecretDtoSchema = schemas.TableValueResultSecretDto
export const TableValueResultTagDtoSchema = schemas.TableValueResultTagDto
export const TableValueResultResourceGroupDtoSchema = schemas.TableValueResultResourceGroupDto
export const TableValueResultWebhookEndpointDtoSchema = schemas.TableValueResultWebhookEndpointDto
export const TableValueResultApiKeyDtoSchema = schemas.TableValueResultApiKeyDto
export const TableValueResultServiceSubscriptionDtoSchema = schemas.TableValueResultServiceSubscriptionDto
export const TableValueResultMonitorVersionDtoSchema = schemas.TableValueResultMonitorVersionDto
export const TableValueResultStatusPageDtoSchema = schemas.TableValueResultStatusPageDto
export const TableValueResultStatusPageComponentDtoSchema = schemas.TableValueResultStatusPageComponentDto
export const TableValueResultStatusPageComponentGroupDtoSchema = schemas.TableValueResultStatusPageComponentGroupDto
export const TableValueResultStatusPageIncidentDtoSchema = schemas.TableValueResultStatusPageIncidentDto
export const TableValueResultStatusPageSubscriberDtoSchema = schemas.TableValueResultStatusPageSubscriberDto
export const TableValueResultStatusPageCustomDomainDtoSchema = schemas.TableValueResultStatusPageCustomDomainDto

// CursorPage wrappers
export const CursorPageCheckResultDtoSchema = schemas.CursorPageCheckResultDto

// ── Generic pagination schema factory ───────────────────────────────

export function tableValueResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalElements: z.number().int().nullable(),
    totalPages: z.number().int().nullable(),
  }).passthrough()
}

export function singleValueResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({data: itemSchema}).passthrough()
}

export function cursorPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }).passthrough()
}
