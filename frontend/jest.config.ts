import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config = {
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.svg$': '<rootDir>/__mocks__/svg.tsx',
	},
	transformIgnorePatterns: ['node_modules/(?!(nuqs)/)'],
}

export default createJestConfig(config)
