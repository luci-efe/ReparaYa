const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Use Node environment by default (for database tests)
  // Component tests will override this in their files with @jest-environment jsdom
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__tests__/helpers/',
    '/__tests__/fixtures/',
    '/tests/database/',
    '/tests/e2e/',
    '/tests/a11y/',
    '/tests/integration/api/contractors/location.test.ts',
    '/tests/integration/api/services-images.test.ts',
    '/tests/integration/api/admin-services.test.ts',
    '/src/modules/contractors/repositories/__tests__/locationRepository.test.ts',
    '/src/modules/contractors/services/__tests__/locationService.test.ts',
    '/src/modules/services/__tests__/serviceService.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts', // Exclude barrel exports from coverage
  ],
  coverageThreshold: {
    global: {
      // Current coverage is ~81% branches. Threshold set at 65% to allow for:
      // 1. New features with error handling branches that may initially lack coverage
      // 2. MVP pace while maintaining quality baseline
      // TODO: Raise to 70% once core features stabilize (owner: team, target: post-MVP)
      branches: 65,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
