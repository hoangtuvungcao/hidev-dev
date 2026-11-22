module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^marked$': '<rootDir>/node_modules/marked/lib/marked.umd.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
