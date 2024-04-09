#!/bin/bash
cd codegen
npx tsc

rm -rf ../packages/abi-v1/src/*
node dist/main.js \
  ../packages/circles-contracts/out/Hub.sol/Hub.json \
  ../packages/abi-v1/src/ \
  V1Hub

node dist/main.js \
  ../packages/circles-contracts/out/Token.sol/Token.json \
  ../packages/abi-v1/src/ \
  V1Token

rm -rf ../packages/abi-v2/src/*
node dist/main.js \
  ../packages/circles-contracts-v2/out/Migration.sol/Migration.json \
  ../packages/abi-v2/src/ \
  Migration

node dist/main.js \
  ../packages/circles-contracts-v2/out/Hub.sol/Hub.json \
  ../packages/abi-v2/src/ \
  V2Hub