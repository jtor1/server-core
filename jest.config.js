const path = require('path');
const projectRoot = path.resolve('.');

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'typings/**/*.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/test_reports/',
  coverageReporters: ['json', 'lcov', 'text'],
  coverageThreshold: {
    global: {
      statements: 58.3,
      branches: 54.3,
      functions: 49.3,
      lines: 59.0,
    },
  },
  globals: {
    'ts-jest': {
      tsConfigFile: '<rootDir>/tsconfig.spec.json',
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  rootDir: projectRoot,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.spec.(ts|js|tsx|jsx)',
    '<rootDir>/src/**/*.test.(ts|js|tsx|jsx)',
    '<rootDir>/test/**/*.{ts,js}',
  ],
  testPathIgnorePatterns: [
    '/test/helpers/.+$',
  ],
  transform: {
    '^.+\\.(tsx?)$': 'ts-jest',
  },
  verbose: true,
};
