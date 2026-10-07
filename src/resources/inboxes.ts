import {z} from 'zod'
import {DevhelmValidationError} from '../errors.js'
import type {ApiClient} from '../http.js'
import {apiGet, apiPost, fetchAllPages, fetchCursorPage, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import type {CursorPage, Page} from '../types.js'
import type {
  CreateWebhookInboxRequest,
  UpdateWebhookInboxRequest,
  WebhookEventDto,
  WebhookInboxDto,
} from '../types.js'
import {
  CreateWebhookInboxRequestSchema,
  UpdateWebhookInboxRequestSchema,
  WebhookEventDtoSchema,
  WebhookInboxDtoSchema,
} from '../schemas.js'
import {parseEnvelopeKey, parseSingle, validateRequest} from '../validation.js'
import {DEFAULT_WAIT_MS, downloadSigned, waitSignal} from './signed-download.js'

const BASE = '/api/v1/webhook/inboxes'

const InboxActivitySchema = z
  .object({
    inboxId: z.string().uuid(),
    buckets: z.array(
      z
        .object({
          hour: z.string(),
          eventCount: z.number().int(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

export interface InboxActivityBucket {
  hour: string
  eventCount: number
}

export interface InboxActivity {
  inboxId: string
  buckets: InboxActivityBucket[]
}

function nameSearch(search?: string): Record<string, unknown> | undefined {
  return search == null ? undefined : {search}
}

export interface WaitInboxOptions {
  timeoutMs?: number
  receivedAfter?: string
  http?: {method?: string; pathPrefix?: string}
}

export interface Inbox extends WebhookInboxDto {
  wait(opts?: WaitInboxOptions): Promise<Event>
  update(body: UpdateWebhookInboxRequest): Promise<Inbox>
  delete(): Promise<void>
  events: InboxEvents
}

export interface ListedEvent extends WebhookEventDto {
  raw(): Promise<File>
  delete(): Promise<void>
}

export interface Event extends ListedEvent {
  text(): string
  json(): unknown
}

export interface InboxEvents {
  list(opts?: {cursor?: string; limit?: number; method?: string; path?: string}): Promise<CursorPage<ListedEvent>>
  get(eventId: string): Promise<Event>
  delete(eventId: string): Promise<void>
  clear(): Promise<void>
}

export class Inboxes {
  constructor(private readonly client: ApiClient) {}

  async list(opts?: {search?: string}): Promise<Inbox[]> {
    const rows = await fetchAllPages(this.client, BASE, WebhookInboxDtoSchema, undefined, nameSearch(opts?.search))
    return rows.map((row) => this.bind(row))
  }

  async listPage(page: number, size: number, opts?: {search?: string}): Promise<Page<Inbox>> {
    const result = await fetchPage(this.client, BASE, WebhookInboxDtoSchema, page, size, nameSearch(opts?.search))
    return {...result, data: result.data.map((row) => this.bind(row))}
  }

  /** Last-24h request counts. An empty id list does not call the API. */
  async activity(inboxIds: string[]): Promise<InboxActivity[]> {
    if (inboxIds.length === 0) return []
    const raw = await apiGet(this.client, `${BASE}/activity`, {inboxIds: inboxIds.join(',')})
    return parseSingle(z.array(InboxActivitySchema), raw, `${BASE}/activity`)
  }

  async get(id: string): Promise<Inbox> {
    const row = await fetchSingle(this.client, 'GET', `${BASE}/${id}`, WebhookInboxDtoSchema)
    return this.bind(row)
  }

  async create(body: CreateWebhookInboxRequest): Promise<Inbox> {
    validateRequest(CreateWebhookInboxRequestSchema, body, 'inboxes.create')
    const row = await fetchSingle(this.client, 'POST', BASE, WebhookInboxDtoSchema, body)
    return this.bind(row)
  }

  async update(id: string, body: UpdateWebhookInboxRequest): Promise<Inbox> {
    validateRequest(UpdateWebhookInboxRequestSchema, body, 'inboxes.update')
    const row = await fetchSingle(this.client, 'PATCH', `${BASE}/${id}`, WebhookInboxDtoSchema, body)
    return this.bind(row)
  }

  async delete(id: string): Promise<void> {
    return fetchVoid(this.client, `${BASE}/${id}`)
  }

  async wait(id: string, opts: WaitInboxOptions = {}): Promise<Event> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_WAIT_MS
    const raw = await apiPost(
      this.client,
      `${BASE}/${id}/wait`,
      {
        timeoutMs,
        ...(opts.receivedAfter ? {receivedAfter: opts.receivedAfter} : {}),
        http: opts.http,
      },
      undefined,
      waitSignal(timeoutMs),
    )
    return this.bindDetail(id, parseEnvelopeKey('event', WebhookEventDtoSchema, raw, `${BASE}/${id}/wait`))
  }

  private bind(dto: WebhookInboxDto): Inbox {
    const events = this.eventsFor(dto.id)
    return {
      ...dto,
      events,
      wait: (opts) => this.wait(dto.id, opts),
      update: (body) => this.update(dto.id, body),
      delete: () => this.delete(dto.id),
    }
  }

  private eventsFor(inboxId: string): InboxEvents {
    return {
      list: async (opts) => {
        const query: Record<string, unknown> = {}
        if (opts?.method != null) query['method'] = opts.method
        if (opts?.path != null) query['path'] = opts.path
        const page = await fetchCursorPage(this.client, `${BASE}/${inboxId}/events`, WebhookEventDtoSchema, {
          cursor: opts?.cursor,
          limit: opts?.limit,
          query,
        })
        return {...page, data: page.data.map((row) => this.bindListed(inboxId, row))}
      },
      get: async (eventId) => {
        const row = await fetchSingle(
          this.client,
          'GET',
          `${BASE}/${inboxId}/events/${eventId}`,
          WebhookEventDtoSchema,
        )
        return this.bindDetail(inboxId, row)
      },
      delete: (eventId) => fetchVoid(this.client, `${BASE}/${inboxId}/events/${eventId}`),
      clear: () => fetchVoid(this.client, `${BASE}/${inboxId}/events`),
    }
  }

  private bindListed(inboxId: string, dto: WebhookEventDto): ListedEvent {
    return {
      ...dto,
      raw: () => downloadSigned(this.client, `${BASE}/${inboxId}/events/${dto.id}/raw`),
      delete: () => fetchVoid(this.client, `${BASE}/${inboxId}/events/${dto.id}`),
    }
  }

  private bindDetail(inboxId: string, dto: WebhookEventDto): Event {
    return {
      ...this.bindListed(inboxId, dto),
      text: () => eventText(dto.body),
      json: () => {
        try {
          return JSON.parse(eventText(dto.body)) as unknown
        } catch (err) {
          if (err instanceof DevhelmValidationError) throw err
          throw new DevhelmValidationError('Event body is not JSON')
        }
      },
    }
  }
}

function eventText(body: string | null | undefined): string {
  if (body == null) throw new DevhelmValidationError('Event body is not on this response')
  return body
}
