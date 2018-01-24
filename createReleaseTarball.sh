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

# Helper function to print the usage instructions.
printUsage () {
  echo "[INFO] Usage: $0 <VERSION_NUMBER>"
  echo "[INFO] <VERSION_NUMBER> is the version number of the tarball you want to create."
}


##############
#  PROLOGUE  #
##############

echo "[INFO] This script only affects your local repo and can be used at any time during development or release."
echo

# Print usage instructions if the first argument is -h or --help.
if [[ $1 == "-h" || $1 == "--help" ]]; then
  printUsage
  exit 1
fi

VERSION=$1
VERSION_WITHOUT_RC=${VERSION%-*}


#############################
#  VALIDATE VERSION NUMBER  #
#############################
if [[ -z $VERSION ]]; then
  echo "[ERROR] Version number not provided."
  echo
  printUsage
  exit 1
elif ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-]+)?$ ]]; then
  echo "[ERROR] Version number (${VERSION}) must be a valid SemVer number."
  echo
  printUsage
  exit 1
fi


###################
#  VALIDATE REPO  #
###################
# Ensure the checked out branch is master.
CHECKED_OUT_BRANCH="$(git branch | grep "*" | awk -F ' ' '{print $2}')"
if [[ $CHECKED_OUT_BRANCH != "master" ]]; then
  read -p "[WARNING] You are on the '${CHECKED_OUT_BRANCH}' branch, not 'master'. Continue? (y/N) " CONTINUE
  echo

  if ! [[ $CONTINUE == "y" || $CONTINUE == "Y" ]]; then
    echo "[INFO] You chose not to continue."
    exit 1
  fi
fi

# Make sure the master branch does not have existing changes.
if ! git --git-dir=".git" diff --quiet; then
  read -p "[WARNING] You have uncommitted changes on the current branch. Continue? (y/N) " CONTINUE
  echo

  if ! [[ $CONTINUE == "y" || $CONTINUE == "Y" ]]; then
    echo "[INFO] You chose not to continue."
    exit 1
  fi
fi


#########################
#  UPDATE package.json  #
#########################
echo "[INFO] Updating version number in package.json to ${VERSION_WITHOUT_RC}..."
sed -i '' -e s/"\"version\": \".*\""/"\"version\": \"${VERSION_WITHOUT_RC}\""/ package.json
echo

#########################
#  UPDATE CHANGELOG.md  #
#########################
echo "[INFO] Updating version number in CHANGELOG.md to ${VERSION_WITHOUT_RC}..."
sed -i '' -e "1 s/# Unreleased//" CHANGELOG.md
echo -e "# Unrelased\n\n-\n\n# v${VERSION_WITHOUT_RC}" | cat - CHANGELOG.md > TEMP_CHANGELOG.md
mv TEMP_CHANGELOG.md CHANGELOG.md

############################
#  REINSTALL DEPENDENCIES  #
############################
echo "[INFO] Removing lib/, and node_modules/..."
rm -rf lib/ node_modules/
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to remove lib/, and node_modules/."
  exit 1
fi
echo

echo "[INFO] Installing production node modules..."
npm install --production
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to install production node modules."
  exit 1
fi
echo


############################
#  CREATE RELEASE TARBALL  #
############################
echo "[INFO] Installing all node modules..."
npm install
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to install all node modules."
  exit 1
fi
echo

echo "[INFO] Running linter..."
npm run lint
if [[ $? -ne 0 ]]; then
  echo "Error: Linter failed."
  exit 1
fi
echo

echo "[INFO] Running unit tests..."
npm run test:unit
if [[ $? -ne 0 ]]; then
  echo "Error: Unit tests failed."
  exit 1
fi
echo

echo "[INFO] Building the release package contents..."
npm run build
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to build release package contents."
  exit 1
fi
echo

echo "[INFO] Running integration tests..."
npm run test:integration -- --updateRules
if [[ $? -ne 0 ]]; then
  echo "Error: Integration tests failed."
  exit 1
fi
echo

echo "[INFO] Packaging up release tarball..."
npm pack
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to package up release tarball."
  exit 1
fi
echo

# Since npm pack uses the version number in the package.json when creating the tarball,
# rename the tarball to include the RC version.
mv firebase-admin-${VERSION_WITHOUT_RC}.tgz firebase-admin-${VERSION}.tgz


############################
#  VERIFY RELEASE TARBALL  #
############################
echo "[INFO] Running release tarball verification..."
bash verifyReleaseTarball.sh firebase-admin-${VERSION}.tgz
if [[ $? -ne 0 ]]; then
  echo "Error: Release tarball failed verification."
  exit 1
fi
echo


##############
#  EPILOGUE  #
##############

echo "[INFO] firebase-admin-${VERSION}.tgz successfully created!"
echo "[INFO] Create a CL for the updated package.json if this is an actual release."
echo
