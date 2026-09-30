Yordle Short URL service
========================

Development environment
-----------------------

For a disposable **Linux x86_64** workspace (including Debian 13), install the
system prerequisites once, then bootstrap the repository:

    sudo apt-get update
    sudo apt-get install -y ca-certificates curl tar gzip python3 openjdk-21-jre-headless build-essential git
    bash scripts/setup-dev.sh
    source .dev/env.sh

The script does not use sudo, modify shell profiles, authenticate to Google,
create cloud resources, or deploy. It installs tools into ignored `.dev/`,
isolates Google CLI configuration there, verifies archive SHA-256 checksums,
installs the Datastore emulator, downloads Go modules, installs the build metadata
tool, and runs `yarn install --immutable`. It is safe to rerun after interruption
or an environment reset. Source `.dev/env.sh` in **every new Bash shell**; after
moving the checkout, rerun setup to regenerate absolute paths.

Pinned development tools:

- Go 1.26.6 (`.go-version` and the `go.mod` toolchain directive)
- Node.js 24.19.0 (`.node-version`, within CI's existing Node 24 line)
- Yarn 4.18.0 (`package.json` and the checked-in `.yarn/releases` file)
- Google Cloud CLI 587.0.0, including `beta` and `cloud-datastore-emulator`
- `github.com/qqiao/app-tools@v1.0.0` (required by `yarn build`)
- Java 21 and a C compiler for the emulator and Go race detector, respectively

Java/system packages receive distribution patch updates; this is a repeatable
application-toolchain bootstrap, not a bit-for-bit operating-system image.
Downloads require access to go.dev/dl.google.com, nodejs.org, Go module and npm
registries, GitHub, and Google Cloud SDK component endpoints. No credentials or
real GCP project are needed for local tests: use the dummy project `local-test`.

On macOS or other architectures, install the same tools manually using their
official installers, put `$(go env GOPATH)/bin` on PATH, enable Corepack, run
`gcloud components install beta cloud-datastore-emulator`, then run
`go install github.com/qqiao/app-tools@v1.0.0` and `yarn install --immutable`.
The automatic archive installer is deliberately Linux x86_64 only.

When updating Go/Node pins, also refresh their checksums in `scripts/setup-dev.sh`.
Official checksum sources: [Go downloads](https://go.dev/dl/?mode=json&include=all),
[Node release manifest](https://nodejs.org/dist/v24.19.0/SHASUMS256.txt), and
[Google versioned archives](https://cloud.google.com/sdk/docs/downloads-versioned-archives).
The Google CLI checksum is calculated from the versioned 587.0.0 archive
(the documentation page lists the moving latest archive). Google CLI/component
versions are updated together in the setup script.

Yordle assumes knowledge of Google Cloud Platform, specifically the App Engine
Go runtimes, and the Go programming language. You can visit
https://cloud.google.com/appengine for information on Google App Engine and
https://go.dev for information on the Go programming language.

The user interface of Yordle is written in
[TypeScript](https://www.typescriptlang.org/).

TypeScript naming conventions
-----------------------------
TypeScript filenames use lowercase kebab-case, with dot-separated conventional
suffixes when needed. For example:

- Source file: `short-url.mts`
- Web component: `yordle-admin.mts`
- Test file: `short-url.test.mts`
- Declaration file: `global.d.ts`

Classes and types continue to use PascalCase, while functions and variables use
camelCase. The filename convention is enforced by `yarn lint`.

Other Readings
--------------
- [Lit](https://lit.dev): Yordle's user interface framework.
- [Redux](https://redux.js.org/): Yordle's state management library.

Getting Yordle
--------------
Yordle is set up as a Go module. Cloning the repository with the pinned Go and
Node.js toolchains is sufficient to install its dependencies.

Working with Yordle
-------------------

#### Running locally
Running the following commands will launch Yordle locally. Manual installers
should omit `source .dev/env.sh` and use their configured toolchain PATH.

    cd $CHECKOUT_DIR
    source .dev/env.sh
    CLOUDSDK_CORE_PROJECT=local-test yarn start

You can then edit and test your application by visiting
http://localhost:8080.

Source changes require stopping the running processes and restarting the local
command so the production bundle is rebuilt.

#### Verification

After setup (and sourcing `.dev/env.sh` when using the Linux bootstrap), run
the same checks as CI:

    go vet ./...
    go run honnef.co/go/tools/cmd/staticcheck@2026.1 ./...
    yarn lint
    yarn typecheck
    CLOUDSDK_CORE_PROJECT=local-test yarn test
    CLOUDSDK_CORE_PROJECT=local-test yarn build
    yarn npm audit --all --recursive --severity high
    go run golang.org/x/vuln/cmd/govulncheck@v1.6.0 ./...

`yarn test` runs the frontend/tooling tests and starts a temporary Datastore
emulator on port 23333 for `go test -race -count=1 ./...`, then stops it.
`go test ./...` alone is not a substitute for the emulator-backed suite.
For fast frontend-only checks, use `yarn test:frontend` and `yarn test:tooling`.
`yarn build` requires `CLOUDSDK_CORE_PROJECT` even though it does not deploy.

#### Deploying to Google App Engine
Please ensure that you have correctly setup your Google Cloud SDK user
authentication.

You can then deploy the application by running:

    cd $CHECKOUT_DIR
    corepack enable
    yarn install --immutable
    CLOUDSDK_CORE_PROJECT=<project_id> yarn deploy

Seeing is believing
-------------------
Visit https://yordle-demo.appspot.com to see Yordle working!
