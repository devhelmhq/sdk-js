/**
 * `tsconfig` path aliases for the closure resolver: the nearest
 * `tsconfig.json` above the importing file (inside the bundle root), with
 * relative `extends` chains, `compilerOptions.baseUrl` and
 * `compilerOptions.paths`.
 */
import {dirnameOf, joinPath} from './paths.js'

export interface TsconfigReader {
  /** UTF-8 text of a root-relative file, or undefined. */
  readText(path: string): string | undefined
}

export interface TsconfigPaths {
  /** Root-relative files of the chain, nearest first. */
  files: string[]
  /** Root-relative directory `paths` targets resolve against. */
  baseDir: string
  hasBaseUrl: boolean
  paths: Array<{pattern: string; targets: string[]}>
}

/** Strip `//` and block comments and trailing commas (JSONC). */
export function stripJsonc(text: string): string {
  let out = ''
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i++
      continue
    }
    out += ch
  }
  return out.replace(/,(\s*[}\]])/g, '$1')
}

interface RawTsconfig {
  extends?: string | string[]
  compilerOptions?: {baseUrl?: string; paths?: Record<string, string[]>}
}

function parseTsconfig(text: string): RawTsconfig | undefined {
  try {
    const parsed: unknown = JSON.parse(stripJsonc(text.replace(/^﻿/, '')))
    return typeof parsed === 'object' && parsed !== null ? (parsed as RawTsconfig) : undefined
  } catch {
    return undefined
  }
}

const cache = new WeakMap<TsconfigReader, Map<string, TsconfigPaths | null>>()

/** The tsconfig governing a file at `fromDir`, or null when there is none. */
export function tsconfigFor(reader: TsconfigReader, fromDir: string): TsconfigPaths | null {
  let memo = cache.get(reader)
  if (!memo) {
    memo = new Map()
    cache.set(reader, memo)
  }
  const hit = memo.get(fromDir)
  if (hit !== undefined) return hit
  let dir = fromDir
  let found: TsconfigPaths | null = null
  while (true) {
    const candidate = dir ? `${dir}/tsconfig.json` : 'tsconfig.json'
    if (reader.readText(candidate) !== undefined) {
      found = loadChain(reader, candidate)
      break
    }
    if (!dir) break
    dir = dirnameOf(dir)
  }
  memo.set(fromDir, found)
  return found
}

function loadChain(reader: TsconfigReader, file: string): TsconfigPaths | null {
  const files: string[] = []
  let baseUrl: {dir: string; value: string} | undefined
  let paths: {dir: string; value: Record<string, string[]>} | undefined
  let current: string | undefined = file
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const text = reader.readText(current)
    if (text === undefined) break
    files.push(current)
    const raw = parseTsconfig(text)
    if (!raw) break
    const dir = dirnameOf(current)
    const options = raw.compilerOptions
    if (!baseUrl && typeof options?.baseUrl === 'string') baseUrl = {dir, value: options.baseUrl}
    if (!paths && options?.paths && typeof options.paths === 'object') paths = {dir, value: options.paths}
    const ext = Array.isArray(raw.extends) ? raw.extends[0] : raw.extends
    if (typeof ext === 'string' && (ext.startsWith('./') || ext.startsWith('../'))) {
      const target = joinPath(dir, ext)
      current = target.endsWith('.json') ? target : `${target}.json`
    } else {
      current = undefined
    }
  }
  if (!baseUrl && !paths) return null
  const baseDir = baseUrl ? joinPath(baseUrl.dir, baseUrl.value) : (paths?.dir ?? '')
  const entries = Object.entries(paths?.value ?? {}).map(([pattern, targets]) => ({
    pattern,
    targets: Array.isArray(targets) ? targets.filter((t): t is string => typeof t === 'string') : [],
  }))
  return {files, baseDir, hasBaseUrl: Boolean(baseUrl), paths: entries}
}

/** Base paths (root-relative, before extension probing) a bare specifier maps to. */
export function aliasTargets(config: TsconfigPaths, spec: string): string[] {
  const out: string[] = []
  let best: {prefixLength: number; targets: string[]; star: string} | undefined
  for (const {pattern, targets} of config.paths) {
    const star = pattern.indexOf('*')
    if (star < 0) {
      if (pattern === spec) {
        best = {prefixLength: Number.MAX_SAFE_INTEGER, targets, star: ''}
      }
      continue
    }
    const prefix = pattern.slice(0, star)
    const suffix = pattern.slice(star + 1)
    if (spec.startsWith(prefix) && spec.endsWith(suffix) && spec.length >= prefix.length + suffix.length) {
      if (!best || prefix.length > best.prefixLength) {
        best = {prefixLength: prefix.length, targets, star: spec.slice(prefix.length, spec.length - suffix.length)}
      }
    }
  }
  if (best) {
    for (const target of best.targets) out.push(joinPath(config.baseDir, target.replace('*', best.star)))
  }
  if (config.hasBaseUrl) out.push(joinPath(config.baseDir, spec))
  return out
}
