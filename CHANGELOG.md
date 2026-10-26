# Changelog

## 1.12.0

### Added
- Code checks (browser and multi-step API): `code` as a path, `{entrypoint, include}` or `{entrypoint, files}` on `monitors.create/update/test/testAdhoc` and `monitors.revisions.create`. The SDK bundles the import closure and checks the server's digest (`BUNDLE_DIGEST_MISMATCH`).
- `@devhelm/sdk/bundler`: `resolveBundle`, `checkBundle`, `computeDigest`, `scanSecrets`, `scanKeys`, `toCreateBundleRequest`, `zipBundle`, `RUNTIME_CATALOG`, `detectSource`. It's shared with the CLI.
- `@devhelm/sdk/web`: a browser-safe client without the filesystem bundler.
- Typed errors per `category`: `ValidationError`, `BlockedError`, `AuthError`, `PermissionError`, `OwnershipError`, `PlanLimitError`, `QuotaError`, `RateLimitError`, `ConflictError`, `ConfirmationRequiredError`, `NotFoundError`, `GoneError`, `PlatformError`, `TransportError` and `WaitTimeoutError`. Each carries every `ErrorResponse` field and `exitCode`. Also new: `errorFromResponse` and `exitCodeForCategory`.
- Transport: `X-DevHelm-Client`, `Idempotency-Key` on every POST, and retries on 429/503/retryable 409 honouring `Retry-After`. The token is resolved from the option, then `DEVHELM_API_TOKEN`, then the CLI context. `DEVHELM_API_URL` is honoured.
- `runs.wait()` and `waitForRun()`: SSE, then polling. They throw only `WaitTimeoutError`.
- Monitors: `probe`, `testAdhoc`, `runNow`, `trigger`, `publish`, `rollback`, `rollbackPreview`, `transfer`, `takeover`, `drift`, `mute`/`unmute`, `quarantine`/`releaseQuarantine`, `restore`, `trash.list`, `validate`, `usagePreview`, `runs`. Also new: `revisions.*`, `versions.list/get`, `history.list/listAll`, `secretRequests.*` and `sessions.*`. `list()` takes filters, including `environment` (slug or id).
- New resources: `runs.*` (including `artifacts`, `events`, `console`, `network`, `traceSummary`, `diff`, `export`, `pin`, `purge`), `bundles.*`, `runtimes.*`, `account.usage/entitlements/me`, `audit.list`, `secrets.values.set/delete`, `secrets.usage`. Incidents gain `update`, `acknowledge`, `addUpdate`, `runs`, `trigger`, `related` and `events`. Status pages gain component overrides and update edits.

### Changed
- `monitors.test(id)` returns the queued `Run` for code monitors. On uptime monitors it still returns the probe result, with a deprecation warning, until 2027-01-31; use `monitors.probe(id)`.
- Public types contain no `any` or `unknown`: free-form JSON is `JsonValue`.
- The `TableValueResult` envelope is decoded sealed (only the historical `nextCursor` key is tolerated).
- `token` is optional in `DevhelmConfig` (env and CLI-context fallbacks).

### Deprecated (removed 2027-01-31)
- `monitors.versions(id)` → `monitors.versions.list(id)`; `monitors.results(id)` → `monitors.history.list(id)`; `monitors.testRun(id)` → `monitors.test(id)`.
- `DevhelmApiError` and its status subclasses, `DevhelmValidationError`, `DevhelmTransportError`, `DevhelmMonitorTestQueuedError`.

### Fixed
- `statusPages.incidents.dismiss` and `statusPages.maintenance.dismiss` no longer fail on the API's 204.
