# Spec: Replace Gulp with Yarn scripts and Node helpers

Status: scope approved by the repository owner on 2026-10-13.

## Objective

Remove Gulp and its type package from Yordle's development dependency graph,
using the existing Yarn scripts and small Node built-in helpers. Keep the
source-map-js 1.2.2 update already in PR 133. Handle this migration separately
from the remaining localization dependency advisory and Go security updates.

## Assumptions and boundaries

- Existing public commands and successful build output remain compatible.
- Node 24.19.0, Yarn 4.18.0, Go 1.26.6, and other unrelated versions stay pinned.
- Add no task runner, glob package, or other third-party dependency.
- Always preserve failure propagation and clean up child processes, including
  on interruption. Never connect tests to a real cloud project.
- Do not patch braces, ignore advisories, change security gates, merge, or deploy.
- Deployment arguments are verified with a stub executable only.
- Ask before changing these criteria or extending the scope.

## Commands

The following entry points retain their names and purposes:

- `CLOUDSDK_CORE_PROJECT=local-test yarn build`: clean, generate locales, run
  Vite, generate build metadata, and copy application files into `dist/`.
- `CLOUDSDK_CORE_PROJECT=local-test yarn test`: frontend and tooling tests,
  then emulator-backed `go test -race -count=1 ./...`.
- `CLOUDSDK_CORE_PROJECT=local-test yarn start`: build, start the Datastore
  emulator, await health readiness, and run the local Go service from `dist/`.
- `CLOUDSDK_CORE_PROJECT=<project> yarn deploy`: build then invoke
  `gcloud -q app deploy --no-promote --project=<project>` from `dist/`.
  This is documented behavior only; no real deployment will be executed.
- Existing `yarn clean`, `yarn i18n:extract`, `yarn i18n:build`, `yarn lint`,
  `yarn typecheck`, `yarn test:frontend`, and `yarn test:tooling` remain available.

## Structure and style

- Put small ESM helpers in `scripts/*.mjs`; avoid introducing a generic runner.
- Put regression coverage in `test/tooling/` using Node's built-in test runner.
- Update `package.json`, the existing `yarn.lock`, and relevant documentation.
- Remove `gulpfile.mjs` after its responsibilities are covered and verified.
- Match the repository's license headers, formatting, camelCase identifiers,
  and lowercase kebab-case filenames.
- Prefer argument arrays over shell interpolation, for example:
  `spawn('go', ['test', '-race', '-count=1', './...'], { env, stdio: 'inherit' })`.

## Success criteria

1. `gulp`, `@types/gulp`, their CLI/watch chains, and `chokidar` are absent
   from the regenerated lockfile unless independently needed by another root.
   The remaining localization chain to braces is reported transparently.
2. Copying preserves the prior relative paths for app configuration, metadata,
   Go module files, static files/images, and non-test Go source files. It does
   not recursively copy `dist/`, hidden tool/cache directories, or Go tests.
3. Tests and local start wait for emulator health; a failed spawn, early
   emulator exit, readiness timeout, command failure, SIGINT, or SIGTERM
   cannot produce a false success or leave owned child processes running.
4. Deployment retains `--no-promote`, project selection, and `dist/` working
   directory. Tests use a stub and make no deployment or cloud changes.
5. Existing frontend, tooling, and emulator-backed Go tests and production build
   pass, together with new copy/lifecycle/command regression tests.
6. Vet, Staticcheck, lint, typecheck, and both dependency scanners are run.
   Known remaining audit failures are reported rather than suppressed.
7. Only the approved migration is pushed to PR 133. Exact-head CI is checked;
   PR 133 remains unmerged.

## Testing strategy

Use temporary filesystem fixtures for copy inclusion/exclusion and relative
layout. Use local stub child programs to check arguments, working directories,
project environment, success/failure, readiness, timeout, and interruption
cleanup. Test the actual Datastore emulator and local server for the normal
workflow. Validate deployment only through the stub.

Full verification after `bash scripts/setup-dev.sh` and `source .dev/env.sh`:

```
go vet ./...
GOTOOLCHAIN=go1.26.6 go run honnef.co/go/tools/cmd/staticcheck@2026.1 ./...
yarn lint
yarn typecheck
CLOUDSDK_CORE_PROJECT=local-test yarn test
CLOUDSDK_CORE_PROJECT=local-test yarn build
yarn npm audit --all --recursive --severity high
go run golang.org/x/vuln/cmd/govulncheck@v1.6.0 ./...
```

## Approval

The owner approved these behavior-preservation criteria and Gulp-only scope on
2026-10-13. Implementation and verification follow this scope.

