# Gulp migration tasks

- [x] Add process and task helpers preserving copy layout and command behavior
  - Verify: focused copy/CLI tests, failure and interrupt cleanup
  - Files: scripts/processes.mjs, scripts/project-tasks.mjs, test/tooling/project-tasks.test.mjs
- [x] Switch Yarn entry points and remove Gulp dependencies
  - Verify: immutable install, dependency tree, source-map-js remains 1.2.2
  - Files: package.json, yarn.lock, gulpfile.mjs
- [x] Update documentation and complete verification
  - Verify: README suite, copy-output comparison, local start smoke test, review
  - Files: README.md, AGENTS.md, tasks documents
- [ ] Push scoped migration and inspect exact-head CI
  - Verify: remote head matches, no introduced failures; report remaining audits
