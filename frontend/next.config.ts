import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	output: 'export',
	turbopack: {
		root: __dirname, // specify the root directory for Turbopack (prevents issues with package-locks at build)
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js',
			},
		},
	},
}

export default nextConfig
