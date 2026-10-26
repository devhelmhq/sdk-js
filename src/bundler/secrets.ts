/**
 * Offline literal-secret scan, the same rules as the server's
 * `BundleSecretScan` (doc 32 D-12). A finding names the file, line and rule;
 * the matched value is never copied into it. A line opts out with
 * `// devhelm-allow-literal: <reason>`.
 */
import type {BundleFiles} from './digest.js'
import {contentBytes, extensionOf} from './digest.js'

export type SecretRule = 'private_key' | 'vendor_token' | 'jwt' | 'header_literal' | 'high_entropy_assignment'

export interface SecretFinding {
  code: 'SECRET_LITERAL'
  file: string
  line: number
  rule: SecretRule
  message: string
}

export interface AllowedLiteral {
  file: string
  line: number
  reason: string
}

export interface SecretScanResult {
  findings: SecretFinding[]
  allowed: AllowedLiteral[]
}

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/
const VENDOR = /sk_live_|sk_test_|ghp_|xox[abp]-|AKIA[A-Z0-9]{16}|dh_live_/
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/
const ASSIGNMENT = /\b([A-Za-z_][A-Za-z0-9_]*)\b\s*=\s*(['"])([^'"]{16,})\2/gi
const IDENTIFIER = /secret|token|password|passwd|api[_-]?key|auth/i
const HEADER = /['"]?(authorization|cookie)['"]?\s*[:=]\s*(['"])([^'"]{8,})\2/i
const ALLOW = /\/\/\s*devhelm-allow-literal:\s*(.*)$/
const SCANNED: ReadonlySet<string> = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml'])

const decoder = new TextDecoder('utf-8', {ignoreBOM: true})

/** Shannon entropy in bits per byte over the UTF-8 bytes of `value`. */
export function shannonEntropy(value: string): number {
  const bytes = new TextEncoder().encode(value)
  const freq = new Array<number>(256).fill(0)
  for (const b of bytes) freq[b] = (freq[b] ?? 0) + 1
  let entropy = 0
  for (const count of freq) {
    if (count === 0) continue
    const p = count / bytes.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

function ruleFor(line: string): SecretRule | null {
  if (PRIVATE_KEY.test(line)) return 'private_key'
  if (VENDOR.test(line)) return 'vendor_token'
  if (JWT.test(line)) return 'jwt'
  if (HEADER.test(line)) return 'header_literal'
  ASSIGNMENT.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ASSIGNMENT.exec(line)) !== null) {
    if (IDENTIFIER.test(match[1] ?? '') && shannonEntropy(match[3] ?? '') >= 3.5) {
      return 'high_entropy_assignment'
    }
  }
  return null
}

/** Scan one file's text. */
export function scanSource(file: string, source: string): SecretScanResult {
  const findings: SecretFinding[] = []
  const allowed: AllowedLiteral[] = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const allow = ALLOW.exec(line)
    if (allow) {
      if (ruleFor(line) !== null) allowed.push({file, line: i + 1, reason: (allow[1] ?? '').trim()})
      continue
    }
    const rule = ruleFor(line)
    if (rule !== null) {
      findings.push({code: 'SECRET_LITERAL', file, line: i + 1, rule, message: `Literal secret in ${file}:${i + 1} (${rule})`})
    }
  }
  return {findings, allowed}
}

/** Scan every scannable file (`.ts .tsx .js .jsx .mjs .cjs .json .yml .yaml`) of a bundle. */
export function scanSecrets(files: BundleFiles): SecretScanResult {
  const findings: SecretFinding[] = []
  const allowed: AllowedLiteral[] = []
  for (const [path, content] of Object.entries(files)) {
    if (!SCANNED.has(extensionOf(path))) continue
    const result = scanSource(path, typeof content === 'string' ? content : decoder.decode(contentBytes(content)))
    findings.push(...result.findings)
    allowed.push(...result.allowed)
  }
  return {findings, allowed}
}
