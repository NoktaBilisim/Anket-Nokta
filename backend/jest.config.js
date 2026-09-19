module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  setupFiles: ['dotenv/config']
};
