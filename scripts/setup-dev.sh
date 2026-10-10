#!/usr/bin/env bash
# User-local bootstrap for disposable Linux x86_64 development environments.
set -euo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [[ ${1:-} == --help ]]; then
  echo 'Usage: bash scripts/setup-dev.sh'
  echo 'Requires Linux x86_64, Bash, curl, tar, sha256sum, Python 3, Java 21 and a C compiler.'
  echo 'Installs pinned tools into .dev/ without sudo, login or shell-profile changes.'
  exit 0
fi
[[ $# == 0 ]] || { echo 'Unexpected argument; use --help' >&2; exit 1; }
[[ $(uname -s)/$(uname -m) == Linux/x86_64 ]] || {
  echo 'Automatic bootstrap supports Linux x86_64 only; see README for manual setup.' >&2
  exit 1
}
for command in curl tar sha256sum python3 java gcc; do
  command -v "$command" >/dev/null || { echo "Missing prerequisite: $command (see README)" >&2; exit 1; }
done
java_version=$(java -version 2>&1)
[[ $java_version == *'version "21.'* ]] || { echo 'Java 21 is required (see README).' >&2; exit 1; }
cd "$ROOT"
GO_VERSION=$(tr -d '\n\r' < .go-version)
NODE_VERSION=$(tr -d '\n\r' < .node-version)
GCLOUD_VERSION=587.0.0
# Go/Node checksums from official manifests; Google CLI from its versioned archive.
GO_SHA256=708effb774be8237570d0add163225abbdfaf4fca28b2611df167beba4feef89
NODE_SHA256=f625d97cd707df4ff96254916fbc5ff014f09c09effe5a1e0ca8f6d41a8789d4
GCLOUD_SHA256=57df2448d259c654796a3703af8e5b53a02d439715b2034d6bb811efc2d6dd7b
[[ $(awk '$1 == "toolchain" {print $2}' go.mod) == "go$GO_VERSION" ]] || {
  echo '.go-version and go.mod toolchain disagree.' >&2; exit 1;
}
mkdir -p .dev/bin .dev/tools
work=$(mktemp -d "$ROOT/.dev/download.XXXXXX")
trap 'rm -rf -- "$work"' EXIT
install_archive() {
  local name=$1 url=$2 checksum=$3 archive_root=$4
  if [[ ! -d $ROOT/.dev/tools/$name ]]; then
    curl --fail --show-error --location --retry 3 "$url" -o "$work/archive.tar.gz"
    echo "$checksum  $work/archive.tar.gz" | sha256sum --check --strict
    mkdir "$work/unpack"
    tar -xzf "$work/archive.tar.gz" -C "$work/unpack"
    mv "$work/unpack/$archive_root" "$ROOT/.dev/tools/$name"
    rmdir "$work/unpack"
  fi
}
install_archive "go-$GO_VERSION" "https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz" "$GO_SHA256" go
install_archive "node-$NODE_VERSION" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" "$NODE_SHA256" "node-v$NODE_VERSION-linux-x64"
install_archive "gcloud-$GCLOUD_VERSION" "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-$GCLOUD_VERSION-linux-x86_64.tar.gz" "$GCLOUD_SHA256" google-cloud-sdk
# A Bash environment file is explicitly sourced per shell; never edit user profiles.
{
  printf 'export PATH=%q:%q:%q:%q:"$PATH"\n' "$ROOT/.dev/bin" "$ROOT/.dev/tools/go-$GO_VERSION/bin" "$ROOT/.dev/tools/node-$NODE_VERSION/bin" "$ROOT/.dev/tools/gcloud-$GCLOUD_VERSION/bin"
  printf 'export GOPATH=%q\n' "$ROOT/.dev/go"
  printf 'export GOCACHE=%q\n' "$ROOT/.dev/go-cache"
  printf 'export GOBIN=%q\n' "$ROOT/.dev/bin"
  printf 'export GOTOOLCHAIN=%q\n' "go$GO_VERSION"
  printf 'export XDG_CACHE_HOME=%q\n' "$ROOT/.dev/cache"
  printf 'export YARN_GLOBAL_FOLDER=%q\n' "$ROOT/.dev/yarn-global"
  printf 'export CLOUDSDK_CONFIG=%q\n' "$ROOT/.dev/gcloud-config"
  printf 'export CLOUDSDK_CORE_DISABLE_USAGE_REPORTING=true\n'
} > .dev/env.sh
source .dev/env.sh
[[ $(go version) == "go version go$GO_VERSION linux/amd64" ]]
[[ $(node --version) == "v$NODE_VERSION" ]]
# Use the checked-in Yarn directly: no global Corepack installation or shims.
printf '#!/usr/bin/env bash\nexec node %q "$@"\n' "$ROOT/.yarn/releases/yarn-4.18.0.cjs" > .dev/bin/yarn
chmod +x .dev/bin/yarn
[[ $(yarn --version) == 4.18.0 ]]
gcloud components install beta cloud-datastore-emulator --quiet
go mod download
go install github.com/qqiao/app-tools@v1.0.0
yarn install --immutable
printf '\nSetup complete. In each new Bash shell run:\n  source %q\n' "$ROOT/.dev/env.sh"
echo 'Then: CLOUDSDK_CORE_PROJECT=local-test yarn test'
