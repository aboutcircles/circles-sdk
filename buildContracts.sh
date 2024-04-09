#!/bin/bash
# This script is used to build the v1 and v2 contracts.
# The output (especially the ABIs) are used in other sdk packages.

# Make sure v1 and v2 contract code is available
git submodule update --init --recursive --remote

# Build the v1 contracts
cd ./packages/circles-contracts
npm install @openzeppelin/contracts@^3.4.0-solc-0.7
npm install @gnosis.pm/safe-contracts@^1.3.0
npm install @circles/safe-contracts@=1.0.14
forge build
cd ../..

# Build the v2 contracts
cd ./packages/circles-contracts-v2
forge build