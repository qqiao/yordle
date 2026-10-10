# Working on Yordle

## Start here

- Read `README.md`, `package.json`, `go.mod`, `gulpfile.mjs`, and
  `.github/workflows/build.yml` before changing workflows or dependencies.
- Discover relevant repository skills under `.agents/skills/`; start with
  `using-agent-skills/SKILL.md` and read only the task-relevant skills.
- In a fresh Linux x86_64 workspace run `bash scripts/setup-dev.sh`, then
  `source .dev/env.sh`. Check README for system prerequisites. Never assume a
  previous session's tools, PATH, dependencies, or processes survived a reset.
- Setup installs pinned tools locally without cloud login. Keep `.dev/`, caches,
  credentials, generated locales, build metadata, and `dist/` out of commits.

## Repository map and conventions

- Root Go files wire the HTTP service; `api/`, `shorturl/`, `shortcode/`,
  `urlutil/`, `config/`, and `runtime/` contain backend code.
- `src/` is the Lit/TypeScript frontend; `test/frontend/` and `test/tooling/`
  contain Node tests. `.mts` files use lowercase kebab-case names, enforced by
  `yarn lint:filenames`. Keep classes/types PascalCase and functions camelCase.
- `xliff/` is localization source; `yarn i18n:build` generates `src/locales/`.
- Use the existing Yarn lockfile and vendored release, not npm install or a new
  package lock. Do not update dependencies/toolchain versions incidentally.
- Keep changes focused and follow existing formatting and license headers.

## Verification and local runtime

Run the README verification sequence before publication: Go vet/Staticcheck,
frontend lint/typecheck, emulator-backed `yarn test`, production bundle build,
and dependency scans. Report blocked checks and exact errors rather than calling
partial checks a pass. CI uses the same bootstrap.

`CLOUDSDK_CORE_PROJECT=local-test yarn test` starts and stops its own emulator
on port 23333 and runs the Go race detector. Ensure the port is free. A plain
`go test ./...` is not equivalent. Frontend-only tests are available separately.

`CLOUDSDK_CORE_PROJECT=local-test yarn start` builds the bundle and starts the
local service at http://localhost:8080 with the emulator. Restart after source
changes. `app-tools` must be on PATH for build metadata generation.

## Cloud boundaries

Use `local-test` and emulator endpoints for development; local verification needs
no GCP credentials. Do not run `gcloud init`, authenticate, modify a real cloud
project, or run `yarn deploy` without explicit authorization. Keep production
credentials out of tests and commits. Opening a PR does not authorize merging or
deployment.
