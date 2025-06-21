// This file configures Jest to automatically mock certain modules in tests
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/chat/tests/setup.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
}
