[![Build Status](https://circleci.com/gh/qqiao/yordle/tree/master.svg?style=svg)](https://circleci.com/gh/qqiao/yordle/tree/master)

Yordle Short URL service
========================

Prerequisites
-------------
To install Yordle, please make sure you have the following prerequisites:

1. A registered Google Cloud Platform project.
2. The most recent version of Google App Engine Go SDK and all its
   dependencies. Instructions on how to obtain the SDK can be found
   [here](https://cloud.google.com/appengine/docs/standard/go/download)
3. Google Cloud Datastore emulator. Documentations and installation guides are
   located [here](https://cloud.google.com/datastore/docs/tools/datastore-emulator).
4. ```yarn``` and Polymer CLI. You can install the latest version of them by
   using the command: ```npm install -g yarn polymer-cli```

Please note that this project can also be built with ```npm```. Please search
and replace all instances of ```yarn``` with ```npm``` in the
```package.json``` file.

Yordle assumes knowledge of Google Cloud Platform, specifically the App Engine
Go runtimes, and the Go programming language. You can visit
https://cloud.google.com/appengine for information on Google App Engine and
https://golang.org for information on the Go programming language.

The user interface of Yordle is written in
[TypeScript](https://www.typescriptlang.org/).

Other Readings
--------------
- [LitElement](https://lit-element.polymer-project.org): Yordle's user
  interface framework.
- [Redux](https://redux.js.org/): Yordle's state management library.

Getting Yordle
--------------
Yordle is set up as a go module, thus simplying cloning this repository should
work for users with Go versions supporting modules, Go > 1.11.

However, for backward compatibility, Yordle is also fully ```go get```
friendly, you can get the source code by running:

    go get -u github.com/qqiao/yordle

Working with Yordle
-------------------

#### Running locally
Running the following commands will launch Yordle locally.

    cd $CHECKOUT_DIR
    yarn install
    CLOUDSDK_CORE_PROJECT=<project_id> yarn run debug

You can then edit and test your application by visiting
http://localhost:9090.

TypeScript changes will be reflected upon the next browser refresh. Go changes,
however, will require killing the current running instancesand restarting.

#### Deploying to Google App Engine
Please ensure that you have correctly setup your Google Cloud SDK user
authentication.

You can then deploy the application by running:

    cd $CHECKOUT_DIR
    yarn install
    CLOUDSDK_CORE_PROJECT=<project_id> yarn run deploy

Seeing is believing
-------------------
Visit https://yordle-demo.appspot.com to see Yordle working!
