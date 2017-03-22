#!/bin/bash

# Fails entire build whenever anything fails
set -e

echo "[INFO] STARTING BUILD"

echo "[INFO] INSTALLING NODE MODULES"
npm install
echo "[INFO] INSTALLING NODE MODULES DONE"

echo "[INFO] COMPILING, LINTING, AND TESTING"
gulp
echo "[INFO] COMPILING, LINTING, AND TESTING DONE"

echo "[INFO] BUILD DONE"
