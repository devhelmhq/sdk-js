/**
 * Secret key names a bundle reads (`process.env.KEY` / `process.env['KEY']`),
 * as the server's `PackageKeyScanner`: first hit per key wins, entrypoint
 * first, then paths in natural order.
 */
import type {BundleFiles} from './digest.js'
import {contentBytes} from './digest.js'
import {lineAt} from './specifiers.js'

export interface KeyLocation {
  key: string
  file: string
  line: number
}

const ENV_ACCESS = /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\])/g
const SOURCE = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const decoder = new TextDecoder('utf-8', {ignoreBOM: true})

export function scanKeys(files: BundleFiles, entrypoint?: string): KeyLocation[] {
  const paths = Object.keys(files).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const ordered = entrypoint && entrypoint in files ? [entrypoint, ...paths.filter((p) => p !== entrypoint)] : paths
  const first = new Map<string, KeyLocation>()
  for (const path of ordered) {
    const lower = path.toLowerCase()
    if (!SOURCE.some((ext) => lower.endsWith(ext))) continue
    if (/(^|\/)(node_modules|\.git)\//.test(path)) continue
    const content = files[path]
    if (content === undefined) continue
    const source = typeof content === 'string' ? content : decoder.decode(contentBytes(content))
    ENV_ACCESS.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = ENV_ACCESS.exec(source)) !== null) {
      const key = match[1] ?? match[2]
      if (!key || first.has(key)) continue
      first.set(key, {key, file: path, line: lineAt(source, match.index)})
    }
  }
  return [...first.values()]
}
