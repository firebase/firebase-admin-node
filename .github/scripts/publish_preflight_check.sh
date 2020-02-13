#!/bin/bash

# Copyright 2020 Google Inc.
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

###################################### Outputs #####################################

# 1. version: The version of this release including the 'v' prefix (e.g. v1.2.3).
# 2. changelog: Formatted changelog text for this release.

####################################################################################

set -e
set -u

function echo_info() {
    local MESSAGE=$1
    echo "[INFO] ${MESSAGE}"
}

function echo_warn() {
    local MESSAGE=$1
    echo "[WARN] ${MESSAGE}"
}

function terminate() {
    echo ""
    echo_warn "--------------------------------------------"
    echo_warn "PREFLIGHT FAILED"
    echo_warn "--------------------------------------------"
    exit 1
}


echo_info "Starting publish preflight check..."
echo_info "Git revision          : ${GITHUB_SHA}"
echo_info "Workflow triggered by : ${GITHUB_ACTOR}"
echo_info "GitHub event          : ${GITHUB_EVENT_NAME}"


echo_info ""
echo_info "--------------------------------------------"
echo_info "Extracting release version"
echo_info "--------------------------------------------"
echo_info ""

echo_info "Loading version from: package.json"

readonly VERSION_SCRIPT="const pkg = require('./package.json'); console.log(pkg.version);"
readonly RELEASE_VERSION=`node -e "${VERSION_SCRIPT}"` || true
if [[ -z "${RELEASE_VERSION}" ]]; then
  echo_warn "Failed to extract release version from: package.json"
  terminate
fi

if [[ ! "${RELEASE_VERSION}" =~ ^([0-9]*)\.([0-9]*)\.([0-9]*)$ ]]; then
  echo_warn "Malformed release version string: ${RELEASE_VERSION}. Exiting."
  terminate
fi

echo_info "Extracted release version: ${RELEASE_VERSION}"
echo "::set-output name=version::v${RELEASE_VERSION}"


echo_info ""
echo_info "--------------------------------------------"
echo_info "Check release artifacts"
echo_info "--------------------------------------------"
echo_info ""

if [[ ! -d dist ]]; then
  echo_warn "dist directory does not exist."
  terminate
fi

readonly RELEASE_ARTIFACT="dist/firebase-admin-${RELEASE_VERSION}.tgz"
if [[ -f "${RELEASE_ARTIFACT}" ]]; then
  echo_info "Found release artifact: ${RELEASE_ARTIFACT}"
else
  echo_warn "Release artifact ${RELEASE_ARTIFACT} not found."
  terminate
fi

readonly ARTIFACT_COUNT=`ls dist/ | wc -l`
if [[ $ARTIFACT_COUNT -ne 1 ]]; then
  echo_warn "Unexpected artifacts in the distribution directory."
  ls -l dist
  terminate
fi


echo_info ""
echo_info "--------------------------------------------"
echo_info "Checking previous releases"
echo_info "--------------------------------------------"
echo_info ""

readonly NPM_DIST_TARBALL=`npm show firebase-admin@${RELEASE_VERSION} dist.tarball`
if [[ -n "${NPM_DIST_TARBALL}" ]]; then
  echo_warn "Release version ${RELEASE_VERSION} already present in NPM."
  terminate
else
  echo_info "Release version ${RELEASE_VERSION} not found in NPM."
fi


echo_info ""
echo_info "--------------------------------------------"
echo_info "Checking release tag"
echo_info "--------------------------------------------"
echo_info ""

echo_info "---< git fetch --depth=1 origin +refs/tags/*:refs/tags/* >---"
git fetch --depth=1 origin +refs/tags/*:refs/tags/*
echo ""

readonly EXISTING_TAG=`git rev-parse -q --verify "refs/tags/v${RELEASE_VERSION}"` || true
if [[ -n "${EXISTING_TAG}" ]]; then
  echo_warn "Tag v${RELEASE_VERSION} already exists. Exiting."
  echo_warn "If the tag was created in a previous unsuccessful attempt, delete it and try again."
  echo_warn "  $ git tag -d v${RELEASE_VERSION}"
  echo_warn "  $ git push --delete origin v${RELEASE_VERSION}"

  readonly RELEASE_URL="https://github.com/firebase/firebase-admin-node/releases/tag/v${RELEASE_VERSION}"
  echo_warn "Delete any corresponding releases at ${RELEASE_URL}."
  terminate
fi

echo_info "Tag v${RELEASE_VERSION} does not exist."


echo_info ""
echo_info "--------------------------------------------"
echo_info "Generating changelog"
echo_info "--------------------------------------------"
echo_info ""

echo_info "---< git fetch origin master --prune --unshallow >---"
git fetch origin master --prune --unshallow
echo ""

echo_info "Generating changelog from history..."
readonly CURRENT_DIR=$(dirname "$0")
readonly CHANGELOG=`${CURRENT_DIR}/generate_changelog.sh`
echo "$CHANGELOG"

# Parse and preformat the text to handle multi-line output.
# See https://github.community/t5/GitHub-Actions/set-output-Truncates-Multiline-Strings/td-p/37870
FILTERED_CHANGELOG=`echo "$CHANGELOG" | grep -v "\\[INFO\\]"` || true
FILTERED_CHANGELOG="${FILTERED_CHANGELOG//'%'/'%25'}"
FILTERED_CHANGELOG="${FILTERED_CHANGELOG//$'\n'/'%0A'}"
FILTERED_CHANGELOG="${FILTERED_CHANGELOG//$'\r'/'%0D'}"
echo "::set-output name=changelog::${FILTERED_CHANGELOG}"


echo ""
echo_info "--------------------------------------------"
echo_info "PREFLIGHT SUCCESSFUL"
echo_info "--------------------------------------------"
