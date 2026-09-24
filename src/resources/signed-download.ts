import type {ApiClient} from '../http.js'
import {fetchSingle} from '../http.js'
import {DevhelmTransportError} from '../errors.js'
import type {SignedDownload} from '../types.js'
import {SignedDownloadSchema} from '../schemas.js'

export const WAIT_SLACK_MS = 10_000
export const DEFAULT_WAIT_MS = 30_000

export function waitSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs + WAIT_SLACK_MS)
}

export async function downloadSigned(client: ApiClient, path: string): Promise<File> {
  const signed = await fetchSingle(client, 'GET', path, SignedDownloadSchema)
  return fileFromSignedUrl(signed)
}

export async function fileFromSignedUrl(signed: SignedDownload): Promise<File> {
  let response: Response
  try {
    response = await fetch(signed.url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new DevhelmTransportError(message, {cause: error})
  }
  if (!response.ok) {
    throw new DevhelmTransportError(`Download failed with status ${response.status}`)
  }
  const bytes = await response.arrayBuffer()
  return new File([bytes], signed.filename, {type: signed.contentType})
}
