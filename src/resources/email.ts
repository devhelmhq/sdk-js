import {z} from 'zod'
import type {ApiClient} from '../http.js'
import {apiGet, apiPost, fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import type {CursorPage, Page} from '../types.js'
import type {
  EmailDomainDto,
  EmailMessageDto,
  InjectEmailMessageResponse,
  InboundEmailAttachment,
  InboundEmailLink,
  InboundOtpCode,
  UpdateEmailDomainRequest,
} from '../types.js'
import {
  CreateEmailDomainRequestSchema,
  EmailDomainDtoSchema,
  EmailMessageDtoSchema,
  InboundEmailLinkSchema,
  InboundOtpCodeSchema,
  InjectEmailMessageRequestSchema,
  InjectEmailMessageResponseSchema,
  UpdateEmailDomainRequestSchema,
} from '../schemas.js'
import {parseCursorPage, parseEnvelopeKey, parseSingle, validateRequest} from '../validation.js'
import {DEFAULT_WAIT_MS, downloadSigned, waitSignal} from './signed-download.js'

const DOMAINS = '/api/v1/email/domains'

const DomainActivitySchema = z
  .object({
    domainId: z.string().uuid(),
    buckets: z.array(
      z
        .object({
          hour: z.string(),
          messageCount: z.number().int(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

const MessageSourceSchema = z
  .object({
    source: z.string(),
    truncated: z.boolean(),
  })
  .passthrough()

export interface DomainActivityBucket {
  hour: string
  messageCount: number
}

export interface DomainActivity {
  domainId: string
  buckets: DomainActivityBucket[]
}

export interface MessageSource {
  source: string
  truncated: boolean
}

function nameSearch(search?: string): Record<string, unknown> | undefined {
  return search == null ? undefined : {search}
}

export interface WaitEmailOptions {
  timeoutMs?: number
  receivedAfter?: string
  subjectContains?: string
}

export interface ReceiveEmailInput {
  from: string
  subject?: string
  text?: string
  html?: string
  headers?: Record<string, string[]>
}

export interface Address {
  email: string
  domain: string
  localPart: string
  wait(opts?: WaitEmailOptions): Promise<Message>
  receive(body: ReceiveEmailInput): Promise<InjectEmailMessageResponse>
  clear(): Promise<void>
  messages: AddressMessages
}

export interface AddressMessages {
  list(opts?: {cursor?: string; limit?: number; q?: string}): Promise<CursorPage<Message>>
  get(messageId: string): Promise<Message>
}

// The generated schema is `.passthrough()`, so its inferred type carries
// `[key: string]: unknown`. Intersecting that index signature with the
// methods below widens every field, including text and html, to `unknown`.
// `z.object(shape)` keeps the generated field types and drops the index.
type EmailMessageFields = z.infer<z.ZodObject<typeof EmailMessageDtoSchema.shape>>

export type Message = Omit<EmailMessageFields, 'attachments'> & {
  attachments: Attachment[]
  raw(): Promise<File>
  source(): Promise<MessageSource>
  delete(): Promise<void>
  listOtp(): Promise<InboundOtpCode[]>
  listLinks(): Promise<InboundEmailLink[]>
}

type Assert<T extends true> = T
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- fails the build if these fields widen to unknown
type MessageBodyFieldsAreTyped = Assert<
  [
    Same<Message['text'], string | null | undefined>,
    Same<Message['html'], string | null | undefined>,
    Same<Message['bodyTruncated'], boolean | null | undefined>,
    Same<Message['rawUrl'], string | null | undefined>,
  ] extends [true, true, true, true]
    ? true
    : false
>

export interface Attachment extends InboundEmailAttachment {
  file(): Promise<File>
}

export interface Domain extends EmailDomainDto {
  verify(): Promise<Domain>
  update(body: UpdateEmailDomainRequest): Promise<Domain>
  delete(): Promise<void>
}

export class EmailDomains {
  constructor(private readonly email: Email) {}

  async list(opts?: {search?: string}): Promise<Domain[]> {
    const rows = await fetchAllPages(
      this.email.client,
      DOMAINS,
      EmailDomainDtoSchema,
      undefined,
      nameSearch(opts?.search),
    )
    return rows.map((row) => this.email.bindDomain(row))
  }

  async listPage(page: number, size: number, opts?: {search?: string}): Promise<Page<Domain>> {
    const result = await fetchPage(
      this.email.client,
      DOMAINS,
      EmailDomainDtoSchema,
      page,
      size,
      nameSearch(opts?.search),
    )
    return {...result, data: result.data.map((row) => this.email.bindDomain(row))}
  }

  /** Last-24h message counts. An empty id list does not call the API. */
  async activity(domainIds: string[]): Promise<DomainActivity[]> {
    if (domainIds.length === 0) return []
    const raw = await apiGet(this.email.client, `${DOMAINS}/activity`, {domainIds: domainIds.join(',')})
    return parseSingle(z.array(DomainActivitySchema), raw, `${DOMAINS}/activity`)
  }

  async get(name: string): Promise<Domain> {
    const row = await fetchSingle(this.email.client, 'GET', `${DOMAINS}/${name}`, EmailDomainDtoSchema)
    return this.email.bindDomain(row)
  }

  async create(body: {name?: string} = {}): Promise<Domain> {
    const payload = body.name ? {kind: 'custom' as const, name: body.name} : {}
    validateRequest(CreateEmailDomainRequestSchema, payload, 'email.domains.create')
    const row = await fetchSingle(this.email.client, 'POST', DOMAINS, EmailDomainDtoSchema, payload)
    return this.email.bindDomain(row)
  }

  async update(name: string, body: UpdateEmailDomainRequest): Promise<Domain> {
    validateRequest(UpdateEmailDomainRequestSchema, body, 'email.domains.update')
    const row = await fetchSingle(this.email.client, 'PATCH', `${DOMAINS}/${name}`, EmailDomainDtoSchema, body)
    return this.email.bindDomain(row)
  }

  async verify(name: string): Promise<Domain> {
    const row = await fetchSingle(this.email.client, 'POST', `${DOMAINS}/${name}/verify`, EmailDomainDtoSchema)
    return this.email.bindDomain(row)
  }

  async delete(name: string): Promise<void> {
    return fetchVoid(this.email.client, `${DOMAINS}/${name}`)
  }
}

export class Email {
  readonly domains: EmailDomains
  /** @internal */
  readonly client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
    this.domains = new EmailDomains(this)
  }

  async address(opts: {label?: string; domain?: string} = {}): Promise<Address> {
    const domain = opts.domain ?? (await this.assignedDomain())
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const localPart = opts.label ? `${opts.label}-${suffix}` : suffix
    return this.bindAddress({email: `${localPart}@${domain}`, domain, localPart})
  }

  async wait(opts: WaitEmailOptions & {to: string}): Promise<Message> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_WAIT_MS
    const raw = await apiPost(
      this.client,
      '/api/v1/email/wait',
      {
        to: opts.to,
        timeoutMs,
        ...(opts.receivedAfter ? {receivedAfter: opts.receivedAfter} : {}),
        subjectContains: opts.subjectContains,
      },
      undefined,
      waitSignal(timeoutMs),
    )
    const message = parseEnvelopeKey('message', EmailMessageDtoSchema, raw, '/api/v1/email/wait')
    const domain = opts.to.slice(opts.to.lastIndexOf('@') + 1)
    return this.bindMessage(domain, message)
  }

  async waitLocalPart(localPart: string, opts: WaitEmailOptions & {domain: string}): Promise<Message> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_WAIT_MS
    const raw = await apiPost(
      this.client,
      `/api/v1/email/${encodeURIComponent(localPart)}/wait`,
      {
        domain: opts.domain,
        timeoutMs,
        ...(opts.receivedAfter ? {receivedAfter: opts.receivedAfter} : {}),
        subjectContains: opts.subjectContains,
      },
      undefined,
      waitSignal(timeoutMs),
    )
    const message = parseEnvelopeKey('message', EmailMessageDtoSchema, raw, `/api/v1/email/${localPart}/wait`)
    return this.bindMessage(opts.domain, message)
  }

  /** @internal */
  bindDomain(dto: EmailDomainDto): Domain {
    return {
      ...dto,
      verify: () => this.domains.verify(dto.name),
      update: (body) => this.domains.update(dto.name, body),
      delete: () => this.domains.delete(dto.name),
    }
  }

  private async assignedDomain(): Promise<string> {
    const domains = await this.domains.list()
    const existing = domains.find((domain) => domain.kind === 'assigned' && domain.status === 'active')
    if (existing) return existing.name
    return (await this.domains.create()).name
  }

  private bindAddress(fields: {email: string; domain: string; localPart: string}): Address {
    return {
      ...fields,
      wait: (opts) => this.wait({...opts, to: fields.email}),
      receive: (body) => this.receive(fields, body),
      clear: () => fetchVoid(this.client, `${DOMAINS}/${fields.domain}/inboxes/${encodeURIComponent(fields.localPart)}`),
      messages: {
        list: async (opts) => {
          const path = `${DOMAINS}/${fields.domain}/messages`
          const query: Record<string, unknown> = {inbox: fields.localPart}
          if (opts?.limit) query['limit'] = opts.limit
          if (opts?.cursor) query['cursor'] = opts.cursor
          if (opts?.q != null) query['q'] = opts.q
          const raw = await apiGet(this.client, path, query)
          const page = parseCursorPage(EmailMessageDtoSchema, raw, path)
          return {
            data: page.data.map((row) => this.bindMessage(fields.domain, row)),
            nextCursor: page.nextCursor ?? null,
            hasMore: page.hasMore,
          }
        },
        get: async (messageId) => {
          const row = await fetchSingle(
            this.client,
            'GET',
            `${DOMAINS}/${fields.domain}/messages/${messageId}`,
            EmailMessageDtoSchema,
          )
          return this.bindMessage(fields.domain, row)
        },
      },
    }
  }

  private async receive(
    fields: {domain: string; email: string},
    body: ReceiveEmailInput,
  ): Promise<InjectEmailMessageResponse> {
    const payload = {to: fields.email, ...body}
    validateRequest(InjectEmailMessageRequestSchema, payload, 'email.receive')
    return fetchSingle(
      this.client,
      'POST',
      `${DOMAINS}/${fields.domain}/messages/inject`,
      InjectEmailMessageResponseSchema,
      payload,
    )
  }

  private bindMessage(domain: string, dto: EmailMessageDto): Message {
    const attachments = (dto.attachments ?? []).map((item) => this.bindAttachment(domain, dto.id, item))
    return {
      ...dto,
      attachments,
      raw: () => downloadSigned(this.client, `${DOMAINS}/${domain}/messages/${dto.id}/raw`),
      source: () =>
        fetchSingle(
          this.client,
          'GET',
          `${DOMAINS}/${domain}/messages/${dto.id}/source`,
          MessageSourceSchema,
        ),
      delete: () => fetchVoid(this.client, `${DOMAINS}/${domain}/messages/${dto.id}`),
      listOtp: () =>
        fetchAllPages(this.client, `${DOMAINS}/${domain}/messages/${dto.id}/otp`, InboundOtpCodeSchema),
      listLinks: () =>
        fetchAllPages(this.client, `${DOMAINS}/${domain}/messages/${dto.id}/links`, InboundEmailLinkSchema),
    }
  }

  private bindAttachment(domain: string, messageId: string, dto: InboundEmailAttachment): Attachment {
    return {
      ...dto,
      file: () => downloadSigned(this.client, `${DOMAINS}/${domain}/messages/${messageId}/attachments/${dto.id}`),
    }
  }
}
