#!/bin/bash
typechain --target ethers-v6 --out-dir ./packages/abi-v1/src/hub './contract-artifacts/v1/Hub.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v1/src/token './contract-artifacts/v1/Token.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v1/src/nameRegistryV1 './contract-artifacts/v1/NameRegistryV1.json'

typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/hub './contract-artifacts/v2/Hub.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/migration './contract-artifacts/v2/Migration.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/nameRegistry './contract-artifacts/v2/NameRegistry.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/demurrageCircles './contract-artifacts/v2/DemurrageCircles.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/inflationaryCircles './contract-artifacts/v2/InflationaryCircles.json'

typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/coreMembersGroup './contract-artifacts/v2/CoreMembersGroup.json'
typechain --target ethers-v6 --out-dir ./packages/abi-v2/src/coreMembersGroupDeployer './contract-artifacts/v2/CMGroupDeployer.json'