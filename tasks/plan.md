# Plan: Replace Gulp without changing public Yarn commands

Approved scope: [migration spec](gulp-migration-spec.md).

1. Add Node process/lifecycle helpers and copy/task entry points. Preserve command
   arguments and output layout; use process groups on Linux/macOS, health checks,
   and cleanup on errors and signals. Avoid shell interpolation and new packages.
2. Add copy and CLI regression tests with temporary files and stub executables.
   Prove missing implementation fails first. Include emulator readiness/timeout,
   early exit, command errors, Ctrl-C, and no-promote deployment arguments.
3. Switch Yarn script targets, remove Gulp/types, regenerate only the existing
   lockfile, and update the README and repository entry-point documentation.
4. Run focused tests, full README checks, production build and local start smoke
   test. Compare copied files against the original Gulp output. Review the diff,
   push only PR133, and inspect exact-head CI to a terminal state.

Risks: process leaks and copy-layout drift are covered with lifecycle/fixture
regressions and a real emulator. Existing localization braces and Go audit
failures remain explicit blockers; do not suppress or fix them in this migration.
