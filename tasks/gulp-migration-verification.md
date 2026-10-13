# Gulp migration verification

Verified locally on 2026-10-13 with the repository's pinned Linux bootstrap.

- Immutable Yarn installation passed. Lockfile removes 140 package resolutions,
  adds none, and retains source-map-js 1.2.2.
- Go vet, Staticcheck, frontend lint, and typecheck passed.
- Four frontend tests and 32 tooling tests passed. Coverage includes filesystem
  copy fidelity, missing files/commands, command failures, readiness timeout,
  occupied IPv4/IPv6 ports, emulator failure, process descendants, SIGINT/SIGTERM,
  and interruption during final cleanup.
- Emulator-backed Go race tests passed for all tested packages.
- Production build passed. Compared with the original Gulp build, all application
  file paths and bytes match, excluding generated build metadata. The one removed
  accidental artifact is node_modules/flatted/golang/pkg/flatted/flatted.go.
- Real `yarn start` returned HTTP 200 at localhost:8080. Ctrl-C exited with 130;
  neither the application nor emulator port remained open on IPv4 or IPv6.
- Deployment arguments and failure propagation were tested with isolated local
  stubs. No deployment, cloud authentication, merge, or advisory exception occurred.
- Independent review identified and verified fixes for cleanup-time interruption
  and checking every localhost address before emulator startup.

## Existing blockers outside this migration

The unchanged npm audit still reports GHSA-vfj7-8cjw-p6xm for braces 3.0.3 through
@lit/localize-tools → fast-glob → micromatch. The Gulp paths are gone.

The unchanged Go vulnerability scan reports 11 reachable advisories in the
existing Go 1.26.6 / x/net 0.58.0 baseline. Its reported fixes are Go 1.26.9 and
x/net 0.60.0. These remain deferred under the approved one-issue-at-a-time scope.

Exact-head CI will be inspected after publication; local passing tests do not
mean the unchanged security gates pass.
