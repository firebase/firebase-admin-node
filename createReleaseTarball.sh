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


####################################
#  REGENERATE npm-shrinkwrap.json  #
####################################
echo "[INFO] Removing lib/, node_modules/, and npm-shrinkwrap..."
rm -rf lib/ node_modules/ npm-shrinkwrap.json
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to remove lib/, node_modules/, and npm-shrinkwrap."
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

echo "[INFO] Regenerating npm-shrinkwrap.json file..."
npm shrinkwrap
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to regenerate npm-shrinkwrap.json file."
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

echo "[INFO] Linting, building, and running unit tests..."
gulp
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to lint, build, and run unit tests."
  exit 1
fi
echo

echo "[INFO] Running integration test suite..."
node test/integration
if [[ $? -ne 0 ]]; then
  echo "Error: Integration test suite failed."
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


##############
#  EPILOGUE  #
##############

echo "[INFO] firebase-admin-${VERSION}.tgz successfully created!"
echo "[INFO] Create a CL for the updated package.json and npm-shrinkwrap.json if this is an actual release."
echo
