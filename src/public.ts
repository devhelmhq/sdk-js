export type {DevhelmConfig, Page, CursorPage} from './types.js'
export {DevhelmClient} from './base-client.js'
export type {IdempotencyCall, TokenSource} from './http.js'
export {
  ERROR_CATEGORIES,
  exitCodeForCategory,
  DevhelmError,
  ValidationError,
  BlockedError,
  AuthError,
  PermissionError,
  OwnershipError,
  PlanLimitError,
  QuotaError,
  RateLimitError,
  ConflictError,
  ConfirmationRequiredError,
  NotFoundError,
  GoneError,
  PlatformError,
  TransportError,
  WaitTimeoutError,
  // Deprecated names, removed 2027-01-31.
  DevhelmApiError,
  DevhelmAuthError,
  DevhelmConflictError,
  DevhelmMonitorTestQueuedError,
  DevhelmNotFoundError,
  DevhelmRateLimitError,
  DevhelmServerError,
  DevhelmTransportError,
  DevhelmValidationError,
} from './errors.js'
export type {
  DevhelmApiErrorOptions,
  DevhelmErrorInit,
  ErrorCategory,
  ErrorEntry,
  ErrorFields,
  ErrorNext,
  ValidationIssue,
} from './errors.js'
export {errorFromResponse, parseRetryAfter} from './error-mapping.js'
export {waitForRun, isFinished, DEFAULT_WAIT_TIMEOUT_MS} from './public-wait.js'
export type {WaitOptions, StreamEventsOptions} from './wait.js'
export type {JsonValue, JsonObject, JsonPrimitive} from './json.js'
export {DEPRECATION_REMOVAL_DATE} from './deprecation.js'
export {SDK_VERSION} from './generated/version.js'

// Re-export all DTO and request types for consumers
export type {
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
  IncidentTimelineDto,
  CheckTraceDto,
  PolicySnapshotDto,
  RuleEvaluationDto,
  IncidentStateTransitionDto,
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
  UpdateWebhookEndpointRequest,
  CreateApiKeyRequest,
  AcquireDeployLockRequest,
  CreateMaintenanceWindowRequest,
  UpdateMaintenanceWindowRequest,
  ServiceSubscribeRequest,
  UpdateAlertSensitivityRequest,
  StatusPageDto,
  StatusPageComponentDto,
  StatusPageComponentGroupDto,
  StatusPageIncidentDto,
  StatusPageIncidentUpdateDto,
  StatusPageIncidentComponentDto,
  StatusPageSubscriberDto,
  StatusPageCustomDomainDto,
  StatusPageBranding,
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
  AddCustomDomainRequest,
  AdminAddSubscriberRequest,
  PublishStatusPageIncidentRequest,
  ReorderComponentsRequest,
  ReorderPageLayoutRequest,
  ComponentPosition,
  AffectedComponent,
  TestChannelResult,
  WebhookTestResult,
} from './types.js'

// Re-export Zod schemas for consumers who want runtime validation
export * as schemas from './schemas.js'

// Re-export resource classes for advanced usage (custom composition)
export {Monitors} from './resources/monitors.js'
export {Incidents} from './resources/incidents.js'
export {Forensics} from './resources/forensics.js'
export type {RuleEvaluationFilters, TransitionFilters} from './resources/forensics.js'
export {AlertChannels} from './resources/alert-channels.js'
export {NotificationPolicies} from './resources/notification-policies.js'
export {Environments} from './resources/environments.js'
export {Secrets} from './resources/secrets.js'
export {Tags} from './resources/tags.js'
export {ResourceGroups} from './resources/resource-groups.js'
export {Webhooks} from './resources/webhooks.js'
export {Inboxes} from './resources/inboxes.js'
export type {Inbox, Event, ListedEvent, InboxActivity, WaitInboxOptions} from './resources/inboxes.js'
export {Email} from './resources/email.js'
export type {
  Address,
  Message,
  Attachment,
  Domain,
  DomainActivity,
  MessageSource,
  WaitEmailOptions,
} from './resources/email.js'
export {ApiKeys} from './resources/api-keys.js'
export {Dependencies} from './resources/dependencies.js'
export {Services} from './resources/services.js'
export type {ServiceListFilters, ServiceIncidentFilters, UptimeRangeOptions} from './resources/services.js'
export {DeployLock} from './resources/deploy-lock.js'
export {Status} from './resources/status.js'
export {StatusPages} from './resources/status-pages.js'
export {MaintenanceWindows} from './resources/maintenance-windows.js'
export type {MaintenanceWindowFilters} from './resources/maintenance-windows.js'

// ── Synthetics ────────────────────────────────────────────────────────
export type {
  BundleDto,
  BundleCheckResultDto,
  CreateBundleRequest,
  MonitorCodeSpec,
  CodeSource,
  RevisionDto,
  RevisionDiffDto,
  RevisionFilesDto,
  CreateDraftRevisionRequest,
  CreateDraftRevisionResponse,
  DefinitionHeadDto,
  PublishRevisionRequest,
  RollbackRevisionRequest,
  RollbackPreviewDto,
  TransferMonitorRequest,
  TakeoverMonitorRequest,
  MonitorDriftDto,
  MonitorOverlayRequest,
  QuarantineMonitorRequest,
  RestoreMonitorRequest,
  MonitorHistoryEntryDto,
  TriggerRunRequest,
  TriggerRunsResponse,
  MonitorTestRequest,
  RunSessionContext,
  RuntimeProfileDto,
  RunEventDto,
  RunCaseDto,
  RunConsoleDto,
  RunNetworkDto,
  NetworkRowDto,
  RunArtifactDto,
  ArtifactDownloadDto,
  RunTraceSummaryDto,
  RunDiffDto,
  RunMetricsSummaryDto,
  RunSkippedEntryDto,
  EvidencePurgeRequest,
  SecretUsageDto,
  MonitorSecretRequestsDto,
  RemapSecretRequest,
  MonitorSessionDto,
  UpsertMonitorSessionRequest,
  SyntheticsUsagePeriodDto,
  EntitlementResponse,
  AuthMeResponse,
  AuditEventDto,
  ValidateMonitorsRequest,
  MonitorValidationResultDto,
  MonitorUsageProjectionDto,
  UpdateIncidentRequest,
  AddIncidentUpdateRequest,
  AcknowledgeAllIncidentsResponse,
  RelatedIncidentsResponse,
  IncidentActivityEventDto,
  IncidentTriggerDto,
  SetStatusPageComponentOverrideRequest,
  UpdateStatusPageIncidentUpdateRequest,
  RegionDto,
  ScriptMonitorConfig,
  RunListFilter,
  MonitorRunListFilter,
  RunConsoleFilter,
  RunNetworkFilter,
  RunCaseFilter,
  RunSkippedFilter,
  AuditLogFilter,
  IncidentFilter,
  MonitorListQuery,
} from './types.js'
export {
  MonitorRevisions,
  MonitorHistory,
  MonitorSecretRequests,
  MonitorSessions,
  MonitorTrash,
  CODE_MONITOR_TYPES,
  isCodeMonitorType,
  checkConfigForType,
  isRun,
} from './resources/monitors.js'
export type {
  MonitorVersions,
  MonitorCode,
  WaitFlag,
  CreateMonitorInput,
  UpdateMonitorInput,
  MonitorListFilter,
  MonitorTestInput,
  AdhocCodeTestInput,
  AdhocProbeTestInput,
  TriggerRunsResult,
  MonitorTestOutcome,
  CodeMonitorType,
  UptimeMonitorType,
  MonitorType,
} from './resources/monitors.js'
export {Runs, RunArtifacts} from './resources/runs.js'
export {Bundles} from './resources/bundles.js'
export type {CodeOptions, CodeResolver, UploadedBundle} from './resources/bundles.js'
export {Runtimes} from './resources/runtimes.js'
export {Account, Audit} from './resources/account.js'
export {SecretValues} from './resources/secrets.js'
export {BundleError} from './bundler/core.js'
export type {
  CodeInput,
  InMemoryCode,
  ResolvedBundle,
  BundleCheck,
  BundleOptions,
  CodeSourceInfo,
} from './bundler/core.js'
export type {BundleFiles, BundleFileContent} from './bundler/digest.js'
export type {BundleFinding, BundleLimits, FindingSeverity, RefusalRule} from './bundler/closure.js'
export type {RuntimePackages} from './bundler/runtime.js'
