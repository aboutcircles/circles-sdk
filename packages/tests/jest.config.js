module.exports = {
  preset: 'ts-jest',
  "ts-jest": {
    "babelConfig": true
  },
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "packages/**/*.{ts,js,jsx}"
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  coveragePathIgnorePatterns: [
    "jest.config.js",
    "/node_modules/",
    "/dist/",
  ],
  moduleNameMapper: {
    "^@circles-sdk/(.*)$": "<rootDir>/../../packages/$1/dist",
  }
};