export {Devhelm} from './client.js'
export type {DevhelmConfig, Page, CursorPage} from './types.js'
export {DevhelmError, AuthError} from './errors.js'
export type {DevhelmErrorCode} from './errors.js'

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
  ApiKeyDto,
  ApiKeyCreateResponse,
  ServiceSubscriptionDto,
  MonitorVersionDto,
  CheckResultDto,
  DashboardOverviewDto,
  DeployLockDto,
  AssertionTestResultDto,
  CreateMonitorRequest,
  UpdateMonitorRequest,
  CreateManualIncidentRequest,
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
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  CreateApiKeyRequest,
  AcquireDeployLockRequest,
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
  UpdateStatusPageIncidentRequest,
  CreateStatusPageIncidentUpdateRequest,
  AddCustomDomainRequest,
  AdminAddSubscriberRequest,
  PublishStatusPageIncidentRequest,
} from './types.js'

// Re-export resource classes for advanced usage (custom composition)
export {Monitors} from './resources/monitors.js'
export {Incidents} from './resources/incidents.js'
export {AlertChannels} from './resources/alert-channels.js'
export {NotificationPolicies} from './resources/notification-policies.js'
export {Environments} from './resources/environments.js'
export {Secrets} from './resources/secrets.js'
export {Tags} from './resources/tags.js'
export {ResourceGroups} from './resources/resource-groups.js'
export {Webhooks} from './resources/webhooks.js'
export {ApiKeys} from './resources/api-keys.js'
export {Dependencies} from './resources/dependencies.js'
export {DeployLock} from './resources/deploy-lock.js'
export {Status} from './resources/status.js'
export {StatusPages} from './resources/status-pages.js'
