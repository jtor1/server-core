const path = require('path');
const projectRoot = path.resolve('.');

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,js}',
    '<rootDir>/typings/**/*.{ts}',
  ],
  coverageDirectory: '<rootDir>/test_reports/',
  coverageReporters: ['json', 'lcov', 'text'],
  coverageThreshold: {
    global: {
      statements: 74.0,
      branches: 78.8,
      functions: 52.1,
      lines: 74.7,
    },
  },
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: {
        warnOnly: false, // In Case of Emergency Break Glass
      },
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  preset: 'ts-jest/presets/js-with-ts',
  rootDir: projectRoot,
  setupFilesAfterEnv: [
    '<rootDir>/test/helpers/globalLifecycleNock.ts',
  ],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.spec.{ts,js}',
    '<rootDir>/test/**/*.{ts,js}',
  ],
  testPathIgnorePatterns: [
    '/test/helpers/.+$',
  ],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
  verbose: true,
};
