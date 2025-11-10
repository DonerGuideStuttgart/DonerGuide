import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	output: 'export',
	turbopack: {
		root: __dirname, // specify the root directory for Turbopack (prevents issues with package-locks at build)
	},
}

export default nextConfig
