/**
 * Waiting for a run to finish (doc 42 §5.4): SSE `GET /runs/{id}/events`
 * first, then polling `GET /runs/{id}` with backoff. Returns the finished
 * run whatever its outcome, throws only {@link WaitTimeoutError} on the
 * deadline (or the caller's abort reason), and never cancels the run.
 */
import type {ApiClient} from './http.js'
import {abortReason, apiGet, errorFromHttpResponse, sleep, transportOf} from './http.js'
import {DevhelmError, WaitTimeoutError} from './errors.js'
import {RunDtoSchema, RunEventDtoSchema} from './schemas.js'
import type {RunDto, RunEventDto} from './types.js'
import {z} from 'zod'
import {parseSingle} from './validation.js'

export const DEFAULT_WAIT_TIMEOUT_MS = 300_000

export interface WaitOptions {
  /** Deadline in milliseconds (default 300 000). The run keeps going after it. */
  timeoutMs?: number
  /** Abort the wait (not the run). */
  signal?: AbortSignal
  /** Called for every streamed run event (steps, phases, headlines). */
  onEvent?: (event: RunEventDto) => void
  /** Polling interval floor when SSE is unavailable (default 1000 ms; backs off to 5000 ms). */
  pollIntervalMs?: number
  /** Use SSE (default true). */
  stream?: boolean
}

export interface StreamEventsOptions {
  /** Replay events with `seq` greater than this. */
  after?: number
  signal?: AbortSignal
}

// Payload values are JSON of any shape on the wire, whatever the spec says.
const RunEventSchema = RunEventDtoSchema.extend({payload: z.record(z.string(), z.json())})

/** Terminal = `phase === 'finished'`. */
export function isFinished(run: Pick<RunDto, 'phase'>): boolean {
  return run.phase === 'finished'
}

async function getRun(client: ApiClient, runId: string, signal: AbortSignal): Promise<RunDto> {
  const path = `/api/v1/runs/${encodeURIComponent(runId)}`
  return parseSingle(RunDtoSchema, await apiGet(client, path, undefined, {signal}), path)
}

/** Parse a `text/event-stream` body into `{id, event, data}` records. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<{id?: string; event?: string; data: string}, void, undefined> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let id: string | undefined
  let event: string | undefined
  let data: string[] = []
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      buffer += decoder.decode(value, {stream: true})
      let newline: number
      while ((newline = buffer.search(/\r\n|\r|\n/)) >= 0) {
        const line = buffer.slice(0, newline)
        const sepLength = buffer.startsWith('\r\n', newline) ? 2 : 1
        buffer = buffer.slice(newline + sepLength)
        if (line === '') {
          if (data.length > 0) yield {id, event, data: data.join('\n')}
          data = []
          event = undefined
          continue
        }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        let value = colon < 0 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'data') data.push(value)
        else if (field === 'id') id = value
        else if (field === 'event') event = value
      }
    }
    buffer += decoder.decode()
    if (buffer.startsWith('data:')) data.push(buffer.slice(buffer.startsWith('data: ') ? 6 : 5))
    if (data.length > 0) yield {id, event, data: data.join('\n')}
  } finally {
    // Close the connection when the consumer stops early (e.g. on `finished`).
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

/** Stream a run's control events (`GET /runs/{id}/events`, SSE) until the stream ends. */
export async function* streamRunEvents(client: ApiClient, runId: string, options: StreamEventsOptions = {}): AsyncGenerator<RunEventDto, void, undefined> {
  const transport = transportOf(client)
  const headers: Record<string, string> = {Accept: 'text/event-stream'}
  if (options.after !== undefined && options.after > 0) headers['Last-Event-ID'] = String(options.after)
  const request = transport.request('GET', `/api/v1/runs/${encodeURIComponent(runId)}/events`, {
    query: options.after !== undefined && options.after > 0 ? {after: options.after} : undefined,
    headers,
    signal: options.signal,
  })
  const response = await transport.send(request)
  if (!response.ok) throw await errorFromHttpResponse(response)
  if (!response.body) return
  for await (const record of readSse(response.body)) {
    let json: unknown
    try {
      json = JSON.parse(record.data)
    } catch {
      continue
    }
    const parsed = RunEventSchema.safeParse(json)
    if (parsed.success) yield parsed.data as RunEventDto
  }
}

function eventFinishes(event: RunEventDto): boolean {
  if (event.type === 'finished') return true
  if (event.type !== 'phase') return false
  const phase = event.payload['phase'] ?? event.payload['to']
  return phase === 'finished'
}

/**
 * Wait for a run to finish and return it. Never throws on a failed run;
 * throws {@link WaitTimeoutError} when `timeoutMs` passes first.
 */
export async function waitForRun(client: ApiClient, runId: string, options: WaitOptions = {}): Promise<RunDto> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('wait deadline', 'TimeoutError'))
  }, timeoutMs)
  const onCallerAbort = () => controller.abort(abortReason(options.signal))
  if (options.signal?.aborted) onCallerAbort()
  options.signal?.addEventListener('abort', onCallerAbort, {once: true})

  let last: RunDto | null = null
  const fail = (e: unknown): never => {
    if (timedOut) throw new WaitTimeoutError(runId, last?.phase ?? 'unknown', timeoutMs, last)
    throw e
  }

  try {
    const signal = controller.signal
    try {
      last = await getRun(client, runId, signal)
    } catch (e) {
      fail(e)
    }
    if (last && isFinished(last)) return last

    let lastSeq = 0
    let streamFailures = 0
    let pollDelay = options.pollIntervalMs ?? 1000
    const useStream = options.stream ?? true
    while (true) {
      if (useStream && streamFailures < 2) {
        try {
          let received = 0
          for await (const event of streamRunEvents(client, runId, {after: lastSeq, signal})) {
            received += 1
            lastSeq = Math.max(lastSeq, event.seq)
            options.onEvent?.(event)
            if (eventFinishes(event)) break
          }
          // A stream that closes without news is not worth reopening in a loop.
          if (received === 0) streamFailures += 1
        } catch (e) {
          if (signal.aborted) fail(e)
          // A permanent error (gone, not found, auth) is reported by the GET below.
          if (e instanceof DevhelmError && e.status !== null && e.status < 500 && e.status !== 429) streamFailures = 2
          else streamFailures += 1
        }
      } else {
        try {
          await sleep(pollDelay, signal)
        } catch (e) {
          fail(e)
        }
        pollDelay = Math.min(pollDelay * 1.5, 5000)
      }
      try {
        last = await getRun(client, runId, signal)
      } catch (e) {
        fail(e)
      }
      if (last && isFinished(last)) return last
      if (useStream && streamFailures < 2) {
        // The stream closed before the run finished: back off before reopening it.
        try {
          await sleep(pollDelay, signal)
        } catch (e) {
          fail(e)
        }
      }
    }
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onCallerAbort)
    // Release any request still open for this wait.
    controller.abort()
  }
}
