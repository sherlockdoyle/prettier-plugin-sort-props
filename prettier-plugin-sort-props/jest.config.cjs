module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      // ts-jest configuration goes here
      // ensure it's compatible with the existing tsconfig.json
      // For example, to handle ES modules if 'type': 'module' is in package.json
      // or if files use ES module syntax:
      tsconfig: {
        // Any specific overrides for ts-jest, if necessary
        // e.g., isolatedModules: true might be needed if you face issues
      }
    }]
  },
  moduleNameMapper: {
    // If you have module aliases in tsconfig.json, map them here
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
    // Handle .onnx file for AIComparator, we can mock it or use a transform
    '\.(onnx)$': '<rootDir>/src/__mocks__/onnxMock.js'
  },
  // Automatically create mock files for imports
  // automock: false, // or true if you prefer default auto-mocking
  // Clear mocks between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [ "/node_modules/" ],
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8', // or 'babel'
  // A list of reporter names that Jest uses when writing coverage reports
  // coverageReporters: [ "json", "text", "lcov", "clover" ],
  // An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: undefined,
  // A path to a custom dependency extractor
  // dependencyExtractor: undefined,
};
