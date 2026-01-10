// Load environment variables for tests
require('dotenv').config({ path: '.env.test' });

const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        // Mock mongodb module to prevent BSON ES module parsing errors
        '^mongodb$': '<rootDir>/__mocks__/mongodb.js',
        '^bson$': '<rootDir>/__mocks__/bson.js',
    },
    testMatch: ['**/__tests__/**/*.test.js'],
    // Ignore transforming specific node_modules (especially those with ES modules)
    transformIgnorePatterns: [
        'node_modules/(?!(\\.(mjs|cjs)|bson|mongodb)/)',
    ],
    // Add global exports for testing
    globals: {
        IS_REACT_ACT_ENVIRONMENT: true,
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
