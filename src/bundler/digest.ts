/**
 * D-12 bundle digest (doc 32 D-12), byte-for-byte the server's
 * `BundleDigestCalculator`:
 *
 *   sha256: + lowercase hex of SHA-256 over M, where M is, for each file in
 *   ascending order of the UTF-8 bytes of its path,
 *   u32be(len(path)) ‖ path ‖ u64be(len(content)) ‖ content
 *
 * Content is raw bytes, except CRLF → LF for the text extensions below.
 * Paths must already be normalized (POSIX, NFC, relative, no `./`).
 */

export const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.txt', '.html', '.css',
])

/** File content in a bundle: UTF-8 text, or raw bytes. */
export type BundleFileContent = string | Uint8Array
/** A bundle as a map of root-relative POSIX paths to content. */
export type BundleFiles = Record<string, BundleFileContent>

const encoder = new TextEncoder()

export function utf8(value: string): Uint8Array {
  return encoder.encode(value)
}

export function contentBytes(content: BundleFileContent): Uint8Array {
  return typeof content === 'string' ? encoder.encode(content) : content
}

export function extensionOf(path: string): string {
  const name = path.toLowerCase().slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot) : ''
}

export function isTextPath(path: string): boolean {
  return TEXT_EXTENSIONS.has(extensionOf(path))
}

/** Compare two strings by their UTF-8 bytes (Java's `compareUtf8`). */
export function compareUtf8(left: string, right: string): number {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const cmp = (a[i] ?? 0) - (b[i] ?? 0)
    if (cmp !== 0) return cmp
  }
  return a.length - b.length
}

/** CRLF → LF for text extensions; every other file is hashed byte for byte. */
export function normalizeContent(path: string, content: Uint8Array): Uint8Array {
  if (!isTextPath(path)) return content
  let crlf = false
  for (let i = 0; i + 1 < content.length; i++) {
    if (content[i] === 0x0d && content[i + 1] === 0x0a) {
      crlf = true
      break
    }
  }
  if (!crlf) return content
  const out = new Uint8Array(content.length)
  let j = 0
  for (let i = 0; i < content.length; i++) {
    const byte = content[i] ?? 0
    if (byte === 0x0d && content[i + 1] === 0x0a) {
      out[j++] = 0x0a
      i++
    } else {
      out[j++] = byte
    }
  }
  return out.subarray(0, j)
}

/** The framed message M the digest hashes. */
export function digestFrame(files: BundleFiles): Uint8Array {
  const paths = Object.keys(files).sort(compareUtf8)
  const parts: Uint8Array[] = []
  let total = 0
  for (const path of paths) {
    const pathBytes = encoder.encode(path)
    const content = normalizeContent(path, contentBytes(files[path] ?? ''))
    const header = new Uint8Array(4 + pathBytes.length + 8)
    const view = new DataView(header.buffer)
    view.setUint32(0, pathBytes.length, false)
    header.set(pathBytes, 4)
    view.setBigUint64(4 + pathBytes.length, BigInt(content.length), false)
    parts.push(header, content)
    total += header.length + content.length
  }
  const framed = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    framed.set(part, offset)
    offset += part.length
  }
  return framed
}

export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

/** SHA-256 over bytes; Node uses `node:crypto`, the browser Web Crypto. */
export type Sha256 = (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array

/** Web Crypto SHA-256 (browsers, Deno, Node ≥ 19 global). */
export const webSha256: Sha256 = async (bytes) => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Web Crypto (crypto.subtle) is not available on this runtime')
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Uint8Array(await subtle.digest('SHA-256', copy.buffer))
}

/** D-12 digest of a file map: `sha256:<64 hex>`. */
export async function computeDigestWith(files: BundleFiles, sha256: Sha256): Promise<string> {
  return `sha256:${toHex(await sha256(digestFrame(files)))}`
}
