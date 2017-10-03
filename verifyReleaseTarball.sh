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

if [ -z "$1" ]; then
    echo "[ERROR] No package name provided."
    echo "[INFO] Usage: ./verifyReleaseTarball.sh <PACKAGE_NAME>"
    exit 1
fi

# Variables
PKG_NAME="$1"
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MOCHA_CLI="$ROOT/node_modules/.bin/mocha -r ts-node/register"
DIR="$ROOT/test/integration/typescript"
WORK_DIR=`mktemp -d`

if [ ! -f "$ROOT/$PKG_NAME" ]; then
  echo "Package $PKG_NAME does not exist."
  exit 1
fi

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

# deletes the temp directory
function cleanup {      
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Enter work dir
pushd "$WORK_DIR"

# Copy test sources into working directory
cp -r $DIR/* .
cp "$ROOT/test/resources/mock.key.json" .

# Install the test package
npm install

# Install firebase-admin package
npm install -S "$ROOT/$PKG_NAME"

echo "> tsc -p tsconfig.json"
tsc -p tsconfig.json

echo "> $MOCHA_CLI src/*.test.ts"
$MOCHA_CLI src/*.test.ts