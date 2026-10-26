/**
 * Bridge file: re-exports generated Zod schemas from the OpenAPI codegen.
 *
 * Import schemas from here — never from generated/schemas.ts directly.
 * This mirrors the dashboard's apiSchemas.ts bridge pattern.
 */

import {
  MonitorDto,
  IncidentDto,
  IncidentDetailDto,
  AlertChannelDto,
  NotificationPolicyDto,
  EnvironmentDto,
  SecretDto,
  TagDto,
  ResourceGroupDto,
  WebhookEndpointDto,
  WebhookInboxDto,
  WebhookEventDto,
  EmailDomainDto,
  EmailMessageDto,
  SignedDownload,
  InjectEmailMessageResponse,
  InboundOtpCode,
  InboundEmailLink,
  InboundEmailAttachment,
  ApiKeyDto,
  ApiKeyCreateResponse,
  ServiceSubscriptionDto,
  MonitorVersionDto,
  CheckResultDto,
  DashboardOverviewDto,
  DeployLockDto,
  AssertionTestResultDto,
  MonitorTestResultDto,
  RunDto,
  MaintenanceWindowDto,
  IncidentTimelineDto,
  CheckTraceDto,
  PolicySnapshotDto,
  RuleEvaluationDto,
  IncidentStateTransitionDto,
  ServiceCatalogDto,
  ServiceDetailDto,
  ServiceLiveStatusDto,
  ServiceStatusDto,
  CategoryDto,
  GlobalStatusSummaryDto,
  ServiceComponentDto,
  ComponentStatusDto,
  ComponentsSummaryDto,
  ComponentUptimeSummaryDto,
  ComponentUptimeDayDto,
  BatchComponentUptimeDto,
  ServiceDayDetailDto,
  ServiceIncidentDto,
  ServiceIncidentDetailDto,
  ServiceIncidentUpdateDto,
  ServiceUptimeResponse,
  UptimeBucketDto,
  ScheduledMaintenanceDto,
  StatusPageDto,
  StatusPageComponentDto,
  StatusPageComponentGroupDto,
  StatusPageIncidentDto,
  StatusPageIncidentUpdateDto,
  StatusPageIncidentComponentDto,
  StatusPageSubscriberDto,
  StatusPageCustomDomainDto,
  StatusPageBranding,
  CreateMonitorRequest,
  UpdateMonitorRequest,
  CodeTestTargetRequest,
  CreateManualIncidentRequest,
  ResolveIncidentRequest,
  CreateAlertChannelRequest,
  UpdateAlertChannelRequest,
  CreateNotificationPolicyRequest,
  UpdateNotificationPolicyRequest,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  CreateSecretRequest,
  UpdateSecretRequest,
  CreateTagRequest,
  UpdateTagRequest,
  CreateResourceGroupRequest,
  UpdateResourceGroupRequest,
  AddResourceGroupMemberRequest,
  CreateWebhookEndpointRequest,
  CreateWebhookInboxRequest,
  UpdateWebhookInboxRequest,
  CreateEmailDomainRequest,
  InjectEmailMessageRequest,
  UpdateEmailDomainRequest,
  UpdateWebhookEndpointRequest,
  CreateApiKeyRequest,
  AcquireDeployLockRequest,
  CreateMaintenanceWindowRequest,
  UpdateMaintenanceWindowRequest,
  ServiceSubscribeRequest,
  UpdateAlertSensitivityRequest,
  CreateStatusPageRequest,
  UpdateStatusPageRequest,
  CreateStatusPageComponentRequest,
  UpdateStatusPageComponentRequest,
  CreateStatusPageComponentGroupRequest,
  UpdateStatusPageComponentGroupRequest,
  CreateStatusPageIncidentRequest,
  CreateStatusPageMaintenanceRequest,
  UpdateStatusPageIncidentRequest,
  CreateStatusPageIncidentUpdateRequest,
  PublishStatusPageIncidentRequest,
  AddCustomDomainRequest,
  AdminAddSubscriberRequest,
  ReorderComponentsRequest,
  ComponentPosition,
  AffectedComponent,
  ReorderPageLayoutRequest,
  TestChannelResult,
  WebhookTestResult,
  ErrorResponse,
  SingleValueResponseMonitorDto,
  SingleValueResponseIncidentDetailDto,
  SingleValueResponseAlertChannelDto,
  SingleValueResponseNotificationPolicyDto,
  SingleValueResponseEnvironmentDto,
  SingleValueResponseSecretDto,
  SingleValueResponseTagDto,
  SingleValueResponseResourceGroupDto,
  SingleValueResponseWebhookEndpointDto,
  SingleValueResponseApiKeyDto,
  SingleValueResponseApiKeyCreateResponse,
  SingleValueResponseServiceSubscriptionDto,
  SingleValueResponseDashboardOverviewDto,
  SingleValueResponseDeployLockDto,
  SingleValueResponseMonitorTestResultDto,
  SingleValueResponseMaintenanceWindowDto,
  SingleValueResponseStatusPageDto,
  SingleValueResponseStatusPageComponentDto,
  SingleValueResponseStatusPageComponentGroupDto,
  SingleValueResponseStatusPageIncidentDto,
  SingleValueResponseStatusPageSubscriberDto,
  SingleValueResponseStatusPageCustomDomainDto,
  SingleValueResponseTestChannelResult,
  SingleValueResponseWebhookTestResult,
  SingleValueResponseResourceGroupMemberDto,
  SingleValueResponseServiceDetailDto,
  SingleValueResponseServiceLiveStatusDto,
  SingleValueResponseGlobalStatusSummaryDto,
  SingleValueResponseBatchComponentUptimeDto,
  SingleValueResponseServiceDayDetailDto,
  SingleValueResponseServiceIncidentDetailDto,
  SingleValueResponseServiceUptimeResponse,
  TableValueResultMonitorDto,
  TableValueResultIncidentDto,
  TableValueResultAlertChannelDto,
  TableValueResultNotificationPolicyDto,
  TableValueResultEnvironmentDto,
  TableValueResultSecretDto,
  TableValueResultTagDto,
  TableValueResultResourceGroupDto,
  TableValueResultWebhookEndpointDto,
  TableValueResultApiKeyDto,
  TableValueResultServiceSubscriptionDto,
  TableValueResultMonitorVersionDto,
  TableValueResultMaintenanceWindowDto,
  TableValueResultStatusPageDto,
  TableValueResultStatusPageComponentDto,
  TableValueResultStatusPageComponentGroupDto,
  TableValueResultStatusPageIncidentDto,
  TableValueResultStatusPageSubscriberDto,
  TableValueResultStatusPageCustomDomainDto,
  TableValueResultCategoryDto,
  TableValueResultServiceComponentDto,
  TableValueResultComponentUptimeDayDto,
  TableValueResultServiceIncidentDto,
  TableValueResultScheduledMaintenanceDto,
  CursorPageCheckResultDto,
  CursorPageServiceCatalogDto,
} from './generated/schemas.js'
export {schemas} from './generated/schemas.js'

import {z} from 'zod'

// ── Response DTO schemas ────────────────────────────────────────────

export const MonitorDtoSchema = MonitorDto
export const IncidentDtoSchema = IncidentDto
export const IncidentDetailDtoSchema = IncidentDetailDto
export const AlertChannelDtoSchema = AlertChannelDto
export const NotificationPolicyDtoSchema = NotificationPolicyDto
export const EnvironmentDtoSchema = EnvironmentDto
export const SecretDtoSchema = SecretDto
export const TagDtoSchema = TagDto
export const ResourceGroupDtoSchema = ResourceGroupDto
export const WebhookEndpointDtoSchema = WebhookEndpointDto
export const WebhookInboxDtoSchema = WebhookInboxDto
export const WebhookEventDtoSchema = WebhookEventDto
export const EmailDomainDtoSchema = EmailDomainDto
export const EmailMessageDtoSchema = EmailMessageDto
export const SignedDownloadSchema = SignedDownload
export const InjectEmailMessageResponseSchema = InjectEmailMessageResponse
export const InboundOtpCodeSchema = InboundOtpCode
export const InboundEmailLinkSchema = InboundEmailLink
export const InboundEmailAttachmentSchema = InboundEmailAttachment
export const ApiKeyDtoSchema = ApiKeyDto
export const ApiKeyCreateResponseSchema = ApiKeyCreateResponse
export const ServiceSubscriptionDtoSchema = ServiceSubscriptionDto
export const MonitorVersionDtoSchema = MonitorVersionDto
export const CheckResultDtoSchema = CheckResultDto
export const DashboardOverviewDtoSchema = DashboardOverviewDto
export const DeployLockDtoSchema = DeployLockDto
export const AssertionTestResultDtoSchema = AssertionTestResultDto
export const MonitorTestResultDtoSchema = MonitorTestResultDto
export const RunDtoSchema = RunDto
export const MaintenanceWindowDtoSchema = MaintenanceWindowDto

// ── Forensic DTO schemas ────────────────────────────────────────────

export const IncidentTimelineDtoSchema = IncidentTimelineDto
export const CheckTraceDtoSchema = CheckTraceDto
export const PolicySnapshotDtoSchema = PolicySnapshotDto
export const RuleEvaluationDtoSchema = RuleEvaluationDto
export const IncidentStateTransitionDtoSchema = IncidentStateTransitionDto

// ── Status Data catalog DTO schemas ─────────────────────────────────

export const ServiceCatalogDtoSchema = ServiceCatalogDto
export const ServiceDetailDtoSchema = ServiceDetailDto
export const ServiceLiveStatusDtoSchema = ServiceLiveStatusDto
export const ServiceStatusDtoSchema = ServiceStatusDto
export const CategoryDtoSchema = CategoryDto
export const GlobalStatusSummaryDtoSchema = GlobalStatusSummaryDto
export const ServiceComponentDtoSchema = ServiceComponentDto
export const ComponentStatusDtoSchema = ComponentStatusDto
export const ComponentsSummaryDtoSchema = ComponentsSummaryDto
export const ComponentUptimeSummaryDtoSchema = ComponentUptimeSummaryDto
export const ComponentUptimeDayDtoSchema = ComponentUptimeDayDto
export const BatchComponentUptimeDtoSchema = BatchComponentUptimeDto
export const ServiceDayDetailDtoSchema = ServiceDayDetailDto
export const ServiceIncidentDtoSchema = ServiceIncidentDto
export const ServiceIncidentDetailDtoSchema = ServiceIncidentDetailDto
export const ServiceIncidentUpdateDtoSchema = ServiceIncidentUpdateDto
export const ServiceUptimeResponseSchema = ServiceUptimeResponse
export const UptimeBucketDtoSchema = UptimeBucketDto
export const ScheduledMaintenanceDtoSchema = ScheduledMaintenanceDto

// ── Status Page DTO schemas ─────────────────────────────────────────

export const StatusPageDtoSchema = StatusPageDto
export const StatusPageComponentDtoSchema = StatusPageComponentDto
export const StatusPageComponentGroupDtoSchema = StatusPageComponentGroupDto
export const StatusPageIncidentDtoSchema = StatusPageIncidentDto
export const StatusPageIncidentUpdateDtoSchema = StatusPageIncidentUpdateDto
export const StatusPageIncidentComponentDtoSchema = StatusPageIncidentComponentDto
export const StatusPageSubscriberDtoSchema = StatusPageSubscriberDto
export const StatusPageCustomDomainDtoSchema = StatusPageCustomDomainDto
export const StatusPageBrandingSchema = StatusPageBranding

// ── Request schemas ─────────────────────────────────────────────────

export const CreateMonitorRequestSchema = CreateMonitorRequest
export const UpdateMonitorRequestSchema = UpdateMonitorRequest
export const CodeTestTargetRequestSchema = CodeTestTargetRequest
export const CreateManualIncidentRequestSchema = CreateManualIncidentRequest
export const ResolveIncidentRequestSchema = ResolveIncidentRequest
export const CreateAlertChannelRequestSchema = CreateAlertChannelRequest
export const UpdateAlertChannelRequestSchema = UpdateAlertChannelRequest
export const CreateNotificationPolicyRequestSchema = CreateNotificationPolicyRequest
export const UpdateNotificationPolicyRequestSchema = UpdateNotificationPolicyRequest
export const CreateEnvironmentRequestSchema = CreateEnvironmentRequest
export const UpdateEnvironmentRequestSchema = UpdateEnvironmentRequest
export const CreateSecretRequestSchema = CreateSecretRequest
export const UpdateSecretRequestSchema = UpdateSecretRequest
export const CreateTagRequestSchema = CreateTagRequest
export const UpdateTagRequestSchema = UpdateTagRequest
export const CreateResourceGroupRequestSchema = CreateResourceGroupRequest
export const UpdateResourceGroupRequestSchema = UpdateResourceGroupRequest
export const AddResourceGroupMemberRequestSchema = AddResourceGroupMemberRequest
export const CreateWebhookEndpointRequestSchema = CreateWebhookEndpointRequest
export const CreateWebhookInboxRequestSchema = CreateWebhookInboxRequest
export const UpdateWebhookInboxRequestSchema = UpdateWebhookInboxRequest
export const CreateEmailDomainRequestSchema = CreateEmailDomainRequest
export const InjectEmailMessageRequestSchema = InjectEmailMessageRequest
export const UpdateEmailDomainRequestSchema = UpdateEmailDomainRequest
export const UpdateWebhookEndpointRequestSchema = UpdateWebhookEndpointRequest
export const CreateApiKeyRequestSchema = CreateApiKeyRequest
export const AcquireDeployLockRequestSchema = AcquireDeployLockRequest
export const CreateMaintenanceWindowRequestSchema = CreateMaintenanceWindowRequest
export const UpdateMaintenanceWindowRequestSchema = UpdateMaintenanceWindowRequest
export const ServiceSubscribeRequestSchema = ServiceSubscribeRequest
export const UpdateAlertSensitivityRequestSchema = UpdateAlertSensitivityRequest

// ── Status Page Request schemas ─────────────────────────────────────

export const CreateStatusPageRequestSchema = CreateStatusPageRequest
export const UpdateStatusPageRequestSchema = UpdateStatusPageRequest
export const CreateStatusPageComponentRequestSchema = CreateStatusPageComponentRequest
export const UpdateStatusPageComponentRequestSchema = UpdateStatusPageComponentRequest
export const CreateStatusPageComponentGroupRequestSchema = CreateStatusPageComponentGroupRequest
export const UpdateStatusPageComponentGroupRequestSchema = UpdateStatusPageComponentGroupRequest
export const CreateStatusPageIncidentRequestSchema = CreateStatusPageIncidentRequest
export const CreateStatusPageMaintenanceRequestSchema = CreateStatusPageMaintenanceRequest
export const UpdateStatusPageIncidentRequestSchema = UpdateStatusPageIncidentRequest
export const CreateStatusPageIncidentUpdateRequestSchema = CreateStatusPageIncidentUpdateRequest
export const PublishStatusPageIncidentRequestSchema = PublishStatusPageIncidentRequest
export const AddCustomDomainRequestSchema = AddCustomDomainRequest
export const AdminAddSubscriberRequestSchema = AdminAddSubscriberRequest
export const ReorderComponentsRequestSchema = ReorderComponentsRequest
export const ComponentPositionSchema = ComponentPosition
export const AffectedComponentSchema = AffectedComponent
export const ReorderPageLayoutRequestSchema = ReorderPageLayoutRequest

// ── Envelope / Pagination schemas ───────────────────────────────────

export const TestChannelResultSchema = TestChannelResult
export const WebhookTestResultSchema = WebhookTestResult

// ── Canonical error envelope ────────────────────────────────────────
//
// The API returns this exact shape on every non-2xx response (see
// `mini/api/.../GlobalExceptionHandler.java`). We expose the generated
// schema so `DevhelmApiError.body` can be typed against the spec rather
// than `unknown`.
export const ErrorResponseSchema = ErrorResponse

// SingleValueResponse wrappers
export const SingleValueResponseMonitorDtoSchema = SingleValueResponseMonitorDto
export const SingleValueResponseIncidentDetailDtoSchema = SingleValueResponseIncidentDetailDto
export const SingleValueResponseAlertChannelDtoSchema = SingleValueResponseAlertChannelDto
export const SingleValueResponseNotificationPolicyDtoSchema = SingleValueResponseNotificationPolicyDto
export const SingleValueResponseEnvironmentDtoSchema = SingleValueResponseEnvironmentDto
export const SingleValueResponseSecretDtoSchema = SingleValueResponseSecretDto
export const SingleValueResponseTagDtoSchema = SingleValueResponseTagDto
export const SingleValueResponseResourceGroupDtoSchema = SingleValueResponseResourceGroupDto
export const SingleValueResponseWebhookEndpointDtoSchema = SingleValueResponseWebhookEndpointDto
export const SingleValueResponseApiKeyDtoSchema = SingleValueResponseApiKeyDto
export const SingleValueResponseApiKeyCreateResponseSchema = SingleValueResponseApiKeyCreateResponse
export const SingleValueResponseServiceSubscriptionDtoSchema = SingleValueResponseServiceSubscriptionDto
export const SingleValueResponseDashboardOverviewDtoSchema = SingleValueResponseDashboardOverviewDto
export const SingleValueResponseDeployLockDtoSchema = SingleValueResponseDeployLockDto
export const SingleValueResponseMonitorTestResultDtoSchema = SingleValueResponseMonitorTestResultDto
export const SingleValueResponseMaintenanceWindowDtoSchema = SingleValueResponseMaintenanceWindowDto
export const SingleValueResponseStatusPageDtoSchema = SingleValueResponseStatusPageDto
export const SingleValueResponseStatusPageComponentDtoSchema = SingleValueResponseStatusPageComponentDto
export const SingleValueResponseStatusPageComponentGroupDtoSchema = SingleValueResponseStatusPageComponentGroupDto
export const SingleValueResponseStatusPageIncidentDtoSchema = SingleValueResponseStatusPageIncidentDto
export const SingleValueResponseStatusPageSubscriberDtoSchema = SingleValueResponseStatusPageSubscriberDto
export const SingleValueResponseStatusPageCustomDomainDtoSchema = SingleValueResponseStatusPageCustomDomainDto
export const SingleValueResponseTestChannelResultSchema = SingleValueResponseTestChannelResult
export const SingleValueResponseWebhookTestResultSchema = SingleValueResponseWebhookTestResult
export const SingleValueResponseResourceGroupMemberDtoSchema = SingleValueResponseResourceGroupMemberDto
export const SingleValueResponseServiceDetailDtoSchema = SingleValueResponseServiceDetailDto
export const SingleValueResponseServiceLiveStatusDtoSchema = SingleValueResponseServiceLiveStatusDto
export const SingleValueResponseGlobalStatusSummaryDtoSchema = SingleValueResponseGlobalStatusSummaryDto
export const SingleValueResponseBatchComponentUptimeDtoSchema = SingleValueResponseBatchComponentUptimeDto
export const SingleValueResponseServiceDayDetailDtoSchema = SingleValueResponseServiceDayDetailDto
export const SingleValueResponseServiceIncidentDetailDtoSchema = SingleValueResponseServiceIncidentDetailDto
export const SingleValueResponseServiceUptimeResponseSchema = SingleValueResponseServiceUptimeResponse

// TableValueResult (paginated) wrappers
export const TableValueResultMonitorDtoSchema = TableValueResultMonitorDto
export const TableValueResultIncidentDtoSchema = TableValueResultIncidentDto
export const TableValueResultAlertChannelDtoSchema = TableValueResultAlertChannelDto
export const TableValueResultNotificationPolicyDtoSchema = TableValueResultNotificationPolicyDto
export const TableValueResultEnvironmentDtoSchema = TableValueResultEnvironmentDto
export const TableValueResultSecretDtoSchema = TableValueResultSecretDto
export const TableValueResultTagDtoSchema = TableValueResultTagDto
export const TableValueResultResourceGroupDtoSchema = TableValueResultResourceGroupDto
export const TableValueResultWebhookEndpointDtoSchema = TableValueResultWebhookEndpointDto
export const TableValueResultApiKeyDtoSchema = TableValueResultApiKeyDto
export const TableValueResultServiceSubscriptionDtoSchema = TableValueResultServiceSubscriptionDto
export const TableValueResultMonitorVersionDtoSchema = TableValueResultMonitorVersionDto
export const TableValueResultMaintenanceWindowDtoSchema = TableValueResultMaintenanceWindowDto
export const TableValueResultStatusPageDtoSchema = TableValueResultStatusPageDto
export const TableValueResultStatusPageComponentDtoSchema = TableValueResultStatusPageComponentDto
export const TableValueResultStatusPageComponentGroupDtoSchema = TableValueResultStatusPageComponentGroupDto
export const TableValueResultStatusPageIncidentDtoSchema = TableValueResultStatusPageIncidentDto
export const TableValueResultStatusPageSubscriberDtoSchema = TableValueResultStatusPageSubscriberDto
export const TableValueResultStatusPageCustomDomainDtoSchema = TableValueResultStatusPageCustomDomainDto
export const TableValueResultCategoryDtoSchema = TableValueResultCategoryDto
export const TableValueResultServiceComponentDtoSchema = TableValueResultServiceComponentDto
export const TableValueResultComponentUptimeDayDtoSchema = TableValueResultComponentUptimeDayDto
export const TableValueResultServiceIncidentDtoSchema = TableValueResultServiceIncidentDto
export const TableValueResultScheduledMaintenanceDtoSchema = TableValueResultScheduledMaintenanceDto

// CursorPage wrappers
export const CursorPageCheckResultDtoSchema = CursorPageCheckResultDto
export const CursorPageServiceCatalogDtoSchema = CursorPageServiceCatalogDto

// ── Generic pagination schema factory ───────────────────────────────

// Envelope factories for callers that want to compose response schemas
// outside of the built-in `parseSingle`/`parsePage`/`parseCursorPage`
// helpers. All three envelopes are sealed; TableValueResult tolerates the
// historical `nextCursor` key.
export function tableValueResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalElements: z.number().int().nullable(),
    totalPages: z.number().int().nullable(),
    nextCursor: z.string().nullable().optional(),
  }).strict()
}

export function singleValueResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({data: itemSchema}).strict()
}

export function cursorPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }).strict()
}

// ── Synthetics: bundles, revisions, runs, runtimes, usage ──────────

export {
  BundleDto as BundleDtoSchema,
  BundleCheckResultDto as BundleCheckResultDtoSchema,
  CreateBundleRequest as CreateBundleRequestSchema,
  MonitorCodeSpec as MonitorCodeSpecSchema,
  CodeSource as CodeSourceSchema,
  RevisionDto as RevisionDtoSchema,
  RevisionDiffDto as RevisionDiffDtoSchema,
  RevisionFilesDto as RevisionFilesDtoSchema,
  CreateDraftRevisionRequest as CreateDraftRevisionRequestSchema,
  CreateDraftRevisionResponse as CreateDraftRevisionResponseSchema,
  DefinitionHeadDto as DefinitionHeadDtoSchema,
  PublishRevisionRequest as PublishRevisionRequestSchema,
  RollbackRevisionRequest as RollbackRevisionRequestSchema,
  RollbackPreviewDto as RollbackPreviewDtoSchema,
  TransferMonitorRequest as TransferMonitorRequestSchema,
  TakeoverMonitorRequest as TakeoverMonitorRequestSchema,
  MonitorDriftDto as MonitorDriftDtoSchema,
  MonitorOverlayRequest as MonitorOverlayRequestSchema,
  QuarantineMonitorRequest as QuarantineMonitorRequestSchema,
  RestoreMonitorRequest as RestoreMonitorRequestSchema,
  MonitorHistoryEntryDto as MonitorHistoryEntryDtoSchema,
  TriggerRunRequest as TriggerRunRequestSchema,
  TriggerRunsResponse as TriggerRunsResponseSchema,
  MonitorTestRequest as MonitorTestRequestSchema,
  RunSessionContext as RunSessionContextSchema,
  RuntimeProfileDto as RuntimeProfileDtoSchema,
  RunEventDto as RunEventDtoSchema,
  RunCaseDto as RunCaseDtoSchema,
  RunConsoleDto as RunConsoleDtoSchema,
  RunNetworkDto as RunNetworkDtoSchema,
  NetworkRowDto as NetworkRowDtoSchema,
  RunArtifactDto as RunArtifactDtoSchema,
  ArtifactDownloadDto as ArtifactDownloadDtoSchema,
  RunTraceSummaryDto as RunTraceSummaryDtoSchema,
  RunDiffDto as RunDiffDtoSchema,
  RunMetricsSummaryDto as RunMetricsSummaryDtoSchema,
  RunSkippedEntryDto as RunSkippedEntryDtoSchema,
  EvidencePurgeRequest as EvidencePurgeRequestSchema,
  SecretUsageDto as SecretUsageDtoSchema,
  WriteSecretEnvironmentValueRequest as WriteSecretEnvironmentValueRequestSchema,
  MonitorSecretRequestsDto as MonitorSecretRequestsDtoSchema,
  RemapSecretRequest as RemapSecretRequestSchema,
  MonitorSessionDto as MonitorSessionDtoSchema,
  UpsertMonitorSessionRequest as UpsertMonitorSessionRequestSchema,
  SyntheticsUsagePeriodDto as SyntheticsUsagePeriodDtoSchema,
  EntitlementResponse as EntitlementResponseSchema,
  AuthMeResponse as AuthMeResponseSchema,
  AuditEventDto as AuditEventDtoSchema,
  ValidateMonitorsRequest as ValidateMonitorsRequestSchema,
  MonitorValidationResultDto as MonitorValidationResultDtoSchema,
  MonitorUsageProjectionDto as MonitorUsageProjectionDtoSchema,
  UpdateIncidentRequest as UpdateIncidentRequestSchema,
  AddIncidentUpdateRequest as AddIncidentUpdateRequestSchema,
  AcknowledgeAllIncidentsResponse as AcknowledgeAllIncidentsResponseSchema,
  RelatedIncidentsResponse as RelatedIncidentsResponseSchema,
  IncidentActivityEventDto as IncidentActivityEventDtoSchema,
  IncidentTriggerDto as IncidentTriggerDtoSchema,
  SetStatusPageComponentOverrideRequest as SetStatusPageComponentOverrideRequestSchema,
  UpdateStatusPageIncidentUpdateRequest as UpdateStatusPageIncidentUpdateRequestSchema,
  RegionDto as RegionDtoSchema,
  ScriptMonitorConfig as ScriptMonitorConfigSchema,
  HttpMonitorConfig as HttpMonitorConfigSchema,
  DnsMonitorConfig as DnsMonitorConfigSchema,
  TcpMonitorConfig as TcpMonitorConfigSchema,
  IcmpMonitorConfig as IcmpMonitorConfigSchema,
  HeartbeatMonitorConfig as HeartbeatMonitorConfigSchema,
  McpServerMonitorConfig as McpServerMonitorConfigSchema,
} from './generated/schemas.js'
