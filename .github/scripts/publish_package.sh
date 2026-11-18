#!/bin/bash

# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e
set -u

touch "$HOME/.npmrc"
cat << 'NPMRC_EOF' > .npmrc
registry=https://us-npm.pkg.dev/oss-exit-gate-prod/firebase-admin-node--npm/
//us-npm.pkg.dev/oss-exit-gate-prod/firebase-admin-node--npm/:always-auth=true
NPMRC_EOF
npx --yes --registry=https://registry.npmjs.org/ google-artifactregistry-auth --repo-config=.npmrc --credential-config="$HOME/.npmrc"

if [ -z "${VERSION:-}" ]; then
  echo "Error: VERSION environment variable is not set." >&2
  exit 1
fi
readonly UNPREFIXED_VERSION=$(echo "${VERSION}" | cut -c 2-)
npm publish "./dist/firebase-admin-${UNPREFIXED_VERSION}.tgz" \
  --registry="https://us-npm.pkg.dev/oss-exit-gate-prod/firebase-admin-node--npm/" \
  --provenance=false

cat << MANIFEST_EOF > manifest.json
{
  "publish_all": false,
  "publishing_groups": [
    {
      "packages": [
        {
          "name": "firebase-admin",
          "version": "${UNPREFIXED_VERSION}"
        }
      ]
    }
  ]
}
MANIFEST_EOF

gcloud storage cp manifest.json \
  "gs://oss-exit-gate-prod-projects-bucket/firebase-admin-node/npm/manifests/manifest-${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-1}.json"
