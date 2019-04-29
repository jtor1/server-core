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
      statements: 29.3,
      branches: 27.3,
      functions: 23.5,
      lines: 27,
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
