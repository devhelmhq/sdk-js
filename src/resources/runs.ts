import type {ApiClient, QueryParams} from '../http.js'
import {apiGet, fetchAllPages, fetchCursorPage, fetchSingle, fetchTable, iterateCursor, transportOf} from '../http.js'
import type {
  ArtifactDownloadDto,
  CursorPage,
  EvidencePurgeRequest,
  NetworkRowDto,
  RunArtifactDto,
  RunCaseDto,
  RunCaseFilter,
  RunConsoleDto,
  RunConsoleFilter,
  RunDiffDto,
  RunDto,
  RunEventDto,
  RunListFilter,
  RunMetricsSummaryDto,
  RunNetworkDto,
  RunNetworkFilter,
  RunSkippedEntryDto,
  RunSkippedFilter,
  RunTraceSummaryDto,
} from '../types.js'
import {
  ArtifactDownloadDtoSchema,
  EvidencePurgeRequestSchema,
  NetworkRowDtoSchema,
  RunArtifactDtoSchema,
  RunCaseDtoSchema,
  RunConsoleDtoSchema,
  RunDiffDtoSchema,
  RunDtoSchema,
  RunMetricsSummaryDtoSchema,
  RunNetworkDtoSchema,
  RunSkippedEntryDtoSchema,
  RunTraceSummaryDtoSchema,
} from '../schemas.js'
import {parse, validateRequest} from '../validation.js'
import {streamRunEvents, waitForRun, type StreamEventsOptions, type WaitOptions} from '../wait.js'

const BASE = '/api/v1/runs'

function runPath(id: string, suffix = ''): string {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`
}

/** Run artifacts: list a run's files, get a signed download URL. */
export class RunArtifacts {
  constructor(private readonly client: ApiClient) {}

  /** `GET /runs/{id}/artifacts`. */
  async list(runId: string): Promise<RunArtifactDto[]> {
    return (await fetchTable(this.client, runPath(runId, '/artifacts'), RunArtifactDtoSchema)).data
  }

  /** `GET /artifacts/{artifactId}/download`: a short-lived signed URL. Traces and HARs are only available this way. */
  async download(artifactId: string): Promise<ArtifactDownloadDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/artifacts/${encodeURIComponent(artifactId)}/download`, ArtifactDownloadDtoSchema)
  }
}

/**
 * Runs: the result of every scheduled check, test, trigger and run-now.
 * A run is the generated `RunDto`, including the server-built `url`.
 */
export class Runs {
  readonly artifacts: RunArtifacts

  constructor(private readonly client: ApiClient) {
    this.artifacts = new RunArtifacts(client)
  }

  /** One page of runs (`GET /runs`, newest first, default last 24 hours). */
  async list(filter: RunListFilter = {}): Promise<CursorPage<RunDto>> {
    const {cursor, limit, ...query} = filter
    return fetchCursorPage(this.client, BASE, RunDtoSchema, {cursor, limit: limit ?? undefined, query})
  }

  /** Iterate every run matching the filter across pages. */
  iterate(filter: RunListFilter = {}): AsyncGenerator<RunDto, void, undefined> {
    const {cursor: _cursor, limit, ...query} = filter
    return iterateCursor(this.client, BASE, RunDtoSchema, {limit: limit ?? undefined, query})
  }

  /** Every run matching the filter (walks all pages; stops after `max`). */
  async listAll(filter: RunListFilter = {}, options: {max?: number} = {}): Promise<RunDto[]> {
    const out: RunDto[] = []
    for await (const run of this.iterate(filter)) {
      out.push(run)
      if (options.max !== undefined && out.length >= options.max) break
    }
    return out
  }

  /** `GET /runs/{id}`. */
  async get(id: string): Promise<RunDto> {
    return fetchSingle(this.client, 'GET', runPath(id), RunDtoSchema)
  }

  /**
   * Wait for a run to finish: SSE first, then polling. Returns the finished
   * run whatever its outcome; throws only `WaitTimeoutError` (default 5 min).
   * Never cancels the run.
   */
  async wait(id: string, options: WaitOptions = {}): Promise<RunDto> {
    return waitForRun(this.client, id, options)
  }

  /** Stream the run's control events (`GET /runs/{id}/events`, SSE). */
  events(id: string, options: StreamEventsOptions = {}): AsyncGenerator<RunEventDto, void, undefined> {
    return streamRunEvents(this.client, id, options)
  }

  /** `POST /runs/{id}/cancel`: requests a cancel; the phase changes when the runner stops. */
  async cancel(id: string): Promise<RunDto> {
    return fetchSingle(this.client, 'POST', runPath(id, '/cancel'), RunDtoSchema)
  }

  /** Test cases and their steps (`GET /runs/{id}/cases`). */
  async steps(id: string, filter: RunCaseFilter = {}): Promise<RunCaseDto[]> {
    return fetchAllPages(this.client, runPath(id, '/cases'), RunCaseDtoSchema, 100, filter)
  }

  /** Console output, grouped by step (`GET /runs/{id}/console`). */
  async console(id: string, filter: Omit<RunConsoleFilter, 'format'> = {}): Promise<RunConsoleDto> {
    return fetchSingle(this.client, 'GET', runPath(id, '/console'), RunConsoleDtoSchema, undefined, filter)
  }

  /** Network rows (`GET /runs/{id}/network`). */
  async network(id: string, filter: RunNetworkFilter = {}): Promise<RunNetworkDto> {
    return parse(RunNetworkDtoSchema, await apiGet(this.client, runPath(id, '/network'), filter), runPath(id, '/network'))
  }

  /** One network row with headers and timings (`GET /runs/{id}/network/{rowId}`). */
  async networkRow(id: string, rowId: string): Promise<NetworkRowDto> {
    return fetchSingle(this.client, 'GET', runPath(id, `/network/${encodeURIComponent(rowId)}`), NetworkRowDtoSchema)
  }

  /** The runner log as text (`GET /runs/{id}/runner-log`). */
  async runnerLog(id: string): Promise<string> {
    return this.text(runPath(id, '/runner-log'), 'text/plain')
  }

  /** Trace summary text and actions (`GET /runs/{id}/trace-summary`). */
  async traceSummary(id: string): Promise<RunTraceSummaryDto> {
    return fetchSingle(this.client, 'GET', runPath(id, '/trace-summary'), RunTraceSummaryDtoSchema)
  }

  /** Compare with a baseline run (`GET /runs/{id}/diff`); default baseline is the last passing run. */
  async diff(id: string, options: {baselineRunId?: string} = {}): Promise<RunDiffDto> {
    return fetchSingle(this.client, 'GET', runPath(id, '/diff'), RunDiffDtoSchema, undefined, options)
  }

  /** The run and its evidence as a zip (`GET /runs/{id}/export`). */
  async export(id: string): Promise<Uint8Array> {
    return this.bytes(runPath(id, '/export'), 'application/zip')
  }

  /** Keep the run past retention (`POST /runs/{id}/pin`). */
  async pin(id: string): Promise<RunDto> {
    return fetchSingle(this.client, 'POST', runPath(id, '/pin'), RunDtoSchema)
  }

  /** `DELETE /runs/{id}/pin`. */
  async unpin(id: string): Promise<RunDto> {
    return fetchSingle(this.client, 'DELETE', runPath(id, '/pin'), RunDtoSchema)
  }

  /** Delete the run's stored evidence, e.g. after a leaked secret (`POST /runs/{id}/purge`). */
  async purge(id: string, body: EvidencePurgeRequest): Promise<RunDto> {
    validateRequest(EvidencePurgeRequestSchema, body, 'runs.purge')
    return fetchSingle(this.client, 'POST', runPath(id, '/purge'), RunDtoSchema, body)
  }

  /** Outcome counts and histogram (`GET /runs/summary`). */
  async summary(filter: RunListFilter = {}): Promise<RunMetricsSummaryDto> {
    return fetchSingle(this.client, 'GET', `${BASE}/summary`, RunMetricsSummaryDtoSchema, undefined, filter)
  }

  /** Runs that did not run (capped, blocked) (`GET /runs/skipped`). */
  async skipped(filter: RunSkippedFilter = {}): Promise<CursorPage<RunSkippedEntryDto>> {
    const {cursor, limit, ...query} = filter
    return fetchCursorPage(this.client, `${BASE}/skipped`, RunSkippedEntryDtoSchema, {cursor, limit: limit ?? undefined, query})
  }

  /** Runs as CSV (`GET /runs/export`). */
  async exportCsv(filter: RunListFilter = {}): Promise<string> {
    return this.text(`${BASE}/export`, 'text/csv', filter)
  }

  private async raw(path: string, accept: string, query?: QueryParams): Promise<Response> {
    const transport = transportOf(this.client)
    return transport.fetchOk(transport.request('GET', path, {headers: {Accept: accept}, query}))
  }

  private async text(path: string, accept: string, query?: QueryParams): Promise<string> {
    return (await this.raw(path, accept, query)).text()
  }

  private async bytes(path: string, accept: string): Promise<Uint8Array> {
    return new Uint8Array(await (await this.raw(path, accept)).arrayBuffer())
  }
}
