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
import {parseCursorPage, parseEnvelopeKey, validateRequest} from '../validation.js'
import {DEFAULT_WAIT_MS, downloadSigned, waitSignal} from './signed-download.js'

const DOMAINS = '/api/v1/email/domains'

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
  list(opts?: {cursor?: string; limit?: number}): Promise<CursorPage<Message>>
  get(messageId: string): Promise<Message>
}

export type Message = Omit<EmailMessageDto, 'attachments'> & {
  attachments: Attachment[]
  raw(): Promise<File>
  delete(): Promise<void>
  listOtp(): Promise<InboundOtpCode[]>
  listLinks(): Promise<InboundEmailLink[]>
}

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

  async list(): Promise<Domain[]> {
    const rows = await fetchAllPages(this.email.client, DOMAINS, EmailDomainDtoSchema)
    return rows.map((row) => this.email.bindDomain(row))
  }

  async listPage(page: number, size: number): Promise<Page<Domain>> {
    const result = await fetchPage(this.email.client, DOMAINS, EmailDomainDtoSchema, page, size)
    return {...result, data: result.data.map((row) => this.email.bindDomain(row))}
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
        receivedAfter: opts.receivedAfter ?? new Date().toISOString(),
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
        receivedAfter: opts.receivedAfter ?? new Date().toISOString(),
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
