export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  setupFiles: ['<rootDir>/test/setupEnv.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/seed/**'],
  testTimeout: 15000,
  clearMocks: true,
};
