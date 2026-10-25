import type {ApiClient} from '../http.js'
import type {SecretDto, CreateSecretRequest, UpdateSecretRequest, Page, SecretUsageDto} from '../types.js'
import {
  SecretDtoSchema,
  CreateSecretRequestSchema,
  UpdateSecretRequestSchema,
  SecretUsageDtoSchema,
  WriteSecretEnvironmentValueRequestSchema,
} from '../schemas.js'
import {apiPut, fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'
import type {Environments} from './environments.js'

function secretPath(key: string, suffix = ''): string {
  return `/api/v1/secrets/${encodeURIComponent(key)}${suffix}`
}

/** Per-environment secret values. Values are write-only: nothing reads them back. */
export class SecretValues {
  constructor(
    private readonly client: ApiClient,
    private readonly environments: Environments,
  ) {}

  /** Set the value of a key in one environment (`PUT /secrets/{key}/environments/{environmentId}`). */
  async set(key: string, input: {environment: string; value: string}): Promise<void> {
    const environmentId = await this.environments.resolveId(input.environment)
    const body = {value: input.value}
    validateRequest(WriteSecretEnvironmentValueRequestSchema, body, 'secrets.values.set')
    await apiPut(this.client, secretPath(key, `/environments/${encodeURIComponent(environmentId)}`), body)
  }

  /** Remove the value of a key in one environment (`DELETE /secrets/{key}/environments/{environmentId}`). */
  async delete(key: string, input: {environment: string}): Promise<void> {
    const environmentId = await this.environments.resolveId(input.environment)
    await fetchVoid(this.client, secretPath(key, `/environments/${encodeURIComponent(environmentId)}`))
  }
}

export class Secrets {
  readonly values: SecretValues

  constructor(
    private readonly client: ApiClient,
    private readonly environments: Environments,
  ) {
    this.values = new SecretValues(client, environments)
  }

  /**
   * List secrets (auto-paginates). Metadata only, never values. With
   * `environment` (slug or id) each secret carries that environment's value stamp.
   */
  async list(filter: {environment?: string} = {}): Promise<SecretDto[]> {
    const query = filter.environment ? {environmentId: await this.environments.resolveId(filter.environment)} : undefined
    return fetchAllPages(this.client, '/api/v1/secrets', SecretDtoSchema, undefined, query)
  }

  /** List secrets with manual page control. */
  async listPage(page: number, size: number): Promise<Page<SecretDto>> {
    return fetchPage(this.client, '/api/v1/secrets', SecretDtoSchema, page, size)
  }

  /** Create a secret. */
  async create(body: CreateSecretRequest): Promise<SecretDto> {
    validateRequest(CreateSecretRequestSchema, body, 'secrets.create')
    return fetchSingle(this.client, 'POST', '/api/v1/secrets', SecretDtoSchema, body)
  }

  /** Update a secret's value by key. */
  async update(key: string, body: UpdateSecretRequest): Promise<SecretDto> {
    validateRequest(UpdateSecretRequestSchema, body, 'secrets.update')
    return fetchSingle(this.client, 'PUT', secretPath(key), SecretDtoSchema, body)
  }

  /** Delete a secret by key. Refused while a monitor uses it. */
  async delete(key: string): Promise<void> {
    return fetchVoid(this.client, secretPath(key))
  }

  /** Monitors that read this key (`GET /secrets/{key}/usage`). */
  async usage(key: string): Promise<SecretUsageDto> {
    return fetchSingle(this.client, 'GET', secretPath(key, '/usage'), SecretUsageDtoSchema)
  }
}
