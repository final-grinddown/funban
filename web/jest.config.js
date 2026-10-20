const nextJest = require("next/jest")

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Path to Next.js app to load next.config.js and .env files
  dir: "./",
})

// Custom Jest configuration
const config = {
  // Test environment for React components
  testEnvironment: "jsdom",

  // Setup files to run before each test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Module paths for absolute imports
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Test file patterns
  testMatch: ["**/__tests__/**/*.(js|jsx|ts|tsx)", "**/*.(test|spec).(js|jsx|ts|tsx)"],

  // Coverage settings
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts", "!src/**/*.stories.{js,jsx,ts,tsx}"],

  // Ignore patterns
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],

  // Transform files
  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
}

// Export Jest config
module.exports = createJestConfig(config)
