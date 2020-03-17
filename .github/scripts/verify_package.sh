# Copyright 2017 Google Inc.
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

#!/bin/bash

# This helper script installs the firebase-admin package locally as a
# typical developer would, and runs some test code using the
# installed package as a dependency. This ensures that the distros
# built by our tools can be installed and consumed by downstream
# applications.

set -e
set -u

if [ -z "$1" ]; then
    echo "[ERROR] No package name provided."
    echo "[INFO] Usage: ./verify_package.sh <PACKAGE_NAME>"
    exit 1
fi

PKG_NAME="$1"
if [ ! -f "${PKG_NAME}" ]; then
  echo "Package ${PKG_NAME} does not exist."
  exit 1
fi

# create a temporary directory
WORK_DIR=`mktemp -d`
if [[ ! "${WORK_DIR}" || ! -d "${WORK_DIR}" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

# deletes the temp directory
function cleanup {
  rm -rf "${WORK_DIR}"
  echo "Deleted temp working directory ${WORK_DIR}"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Copy package and test sources into working directory
cp "${PKG_NAME}" "${WORK_DIR}"
cp -r test/integration/typescript/* "${WORK_DIR}"
cp test/resources/mock.key.json "${WORK_DIR}"

# Enter work dir
pushd "${WORK_DIR}"

# Install the test package
npm install

# Install firebase-admin package
npm install -S "${PKG_NAME}"

echo "> tsc -p tsconfig.json"
./node_modules/.bin/tsc -p tsconfig.json

MOCHA_CLI="./node_modules/.bin/mocha -r ts-node/register"
echo "> $MOCHA_CLI src/*.test.ts"
$MOCHA_CLI src/*.test.ts
