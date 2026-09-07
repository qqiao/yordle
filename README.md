Yordle Short URL service
========================

Prerequisites
-------------
To install Yordle, please make sure you have the following prerequisites:

1. A registered Google Cloud Platform project.
2. Go 1.26.6. The repository pins this version in `go.mod` and `.go-version`.
3. The most recent Google Cloud CLI with the App Engine and Cloud Datastore
   emulator components. Installation instructions can be found
   [here](https://cloud.google.com/sdk/docs/install).
4. Node.js 24 with Corepack enabled. The repository includes its pinned Yarn
   release, so a global Yarn installation is not required.

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
Running the following commands will launch Yordle locally.

    cd $CHECKOUT_DIR
    corepack enable
    yarn install --immutable
    CLOUDSDK_CORE_PROJECT=<project_id> yarn start

You can then edit and test your application by visiting
http://localhost:8080.

Source changes require stopping the running processes and restarting the local
command so the production bundle is rebuilt.

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
