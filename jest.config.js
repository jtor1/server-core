const path = require('path');
const projectRoot = path.resolve('.');

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    `src/**/*.{ts,tsx}`,
    `typings/**/*.{ts,tsx}`,
  ],
  coverageDirectory: `${projectRoot}/test_reports/`,
  coverageReporters: ['json', 'lcov', 'text'],
  coverageThreshold: {
    global: {
      statements: 34.1,
      branches: 24.3,
      functions: 26.1,
      lines: 32.5,
    },
  },
  globals: {
    'ts-jest': {
      tsConfigFile: `${projectRoot}/tsconfig.spec.json`,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  rootDir: projectRoot,
  testEnvironment: 'node',
  testMatch: [
    // `${projectRoot}/tests/**/*.test.(ts|js|tsx|jsx)`,
    `${projectRoot}/src/**/*.spec.(ts|js|tsx|jsx)`,
  ],
  transform: {
    '^.+\\.(tsx?)$': `ts-jest`,
  },
  verbose: true,
};
