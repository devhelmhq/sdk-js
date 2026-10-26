/**
 * Advisory `code.source {repo, branch, commit, file}` from CI env vars or
 * `git` (doc 42 §5.3). Never fails: missing values stay null.
 */
import {execFileSync} from 'node:child_process'
import {relative, sep} from 'node:path'

import type {CodeSourceInfo} from './core.js'

type Env = Record<string, string | undefined>

function git(cwd: string, args: string[]): string | null {
  try {
    const out = execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000})
    const value = out.trim()
    return value || null
  } catch {
    return null
  }
}

/** `git@github.com:acme/web.git` / `https://github.com/acme/web` → `acme/web`. */
export function repoFromRemote(url: string): string {
  let value = url.trim().replace(/\.git$/, '')
  const scp = /^[^@/]+@[^:]+:(.+)$/.exec(value)
  if (scp?.[1]) return scp[1]
  try {
    const parsed = new URL(value)
    value = parsed.pathname.replace(/^\/+/, '')
    return value
  } catch {
    return value
  }
}

/**
 * Detect the source of an entrypoint. CI variables win (GitHub Actions,
 * GitLab CI, Buildkite, CircleCI, Bitbucket), then `git` in `cwd`.
 */
export function detectSource(entrypointAbs: string, cwd: string, env: Env = process.env): CodeSourceInfo {
  let repo = env['GITHUB_REPOSITORY'] ?? env['CI_PROJECT_PATH'] ?? env['BITBUCKET_REPO_FULL_NAME'] ?? null
  let branch =
    env['GITHUB_HEAD_REF'] || env['GITHUB_REF_NAME'] || env['CI_COMMIT_REF_NAME'] || env['BUILDKITE_BRANCH'] ||
    env['CIRCLE_BRANCH'] || env['BITBUCKET_BRANCH'] || null
  let commit = env['GITHUB_SHA'] ?? env['CI_COMMIT_SHA'] ?? env['BUILDKITE_COMMIT'] ?? env['CIRCLE_SHA1'] ?? env['BITBUCKET_COMMIT'] ?? null

  const top = git(cwd, ['rev-parse', '--show-toplevel'])
  if (top) {
    if (!commit) commit = git(cwd, ['rev-parse', 'HEAD'])
    if (!branch) {
      const name = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
      branch = name && name !== 'HEAD' ? name : null
    }
    if (!repo) {
      const remote = git(cwd, ['config', '--get', 'remote.origin.url'])
      repo = remote ? repoFromRemote(remote) : null
    }
  }
  const base = top ?? cwd
  const rel = relative(base, entrypointAbs)
  const file = rel && !rel.startsWith('..') ? rel.split(sep).join('/') : null
  return {
    repo: repo ? repo.slice(0, 512) : null,
    branch: branch ? branch.slice(0, 255) : null,
    commit: commit ? commit.slice(0, 64) : null,
    file: file ? file.slice(0, 512) : null,
  }
}
