module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js'],
  verbose: true,
  collectCoverageFrom: [
    'newtab.js',
    '!**/node_modules/**'
  ],
  testTimeout: 10000
};
