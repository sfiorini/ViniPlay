module.exports = {
  test: {
    environment: 'node',
    setupFiles: ['tests/setup/test-env.js'],
    restoreMocks: true,
    clearMocks: true,
    isolate: true,
    globals: true
  }
};
