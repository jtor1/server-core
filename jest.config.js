const path = require('path');
const projectRoot = path.resolve('.');

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    `**/templates/**/*.{ts,tsx}`,
  ],
  coverageDirectory: `${projectRoot}/test_reports/`,
  coverageReporters: ['json', 'lcov', 'text'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 20,
      lines: 50,
      statements: 50,
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
