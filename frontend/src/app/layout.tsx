import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'

import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { NuqsAdapter } from 'nuqs/adapters/react'

const rubikSans = Rubik({
	variable: '--font-rubik-sans',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: {
		template: '%s | Dönerguide Stuttgart',
		default: 'Dönerguide Stuttgart',
	},
	description: 'Eine Web-App, um den besten Döner in Stuttgart zu finden.',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="de">
			<body className={`${rubikSans.className} antialiased bg-base-300`}>
				<NuqsAdapter>
					<Navbar />
					{children}
					<Footer />
				</NuqsAdapter>
			</body>
		</html>
	)
}
