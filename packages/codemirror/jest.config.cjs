/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
const esModules = ['@codemirror'].join('|');

module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest/legacy',
      {
        tsconfig: `./tsconfig.test.json`
      }
    ],
    '^.+\\.jsx?$': 'babel-jest'
  },
  testTimeout: 10000,
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
    'mjs',
    'cjs'
  ],
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`],
  reporters: ['default', 'jest-junit', 'github-actions'],
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  coverageDirectory: 'coverage',
  testRegex: 'src/__tests__/.*.spec.ts[x]?$'
};
