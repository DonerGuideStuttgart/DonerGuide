import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'

const rubikSans = Rubik({
	variable: '--font-rubik-sans',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: {
		template: '%s | Dönerguide Stuttgart',
		default: 'Dönerguide Stuttgart',
	},
	description: 'A web app where you can find the best kebab in Stuttgart.',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${rubikSans.variable} antialiased`}>{children}</body>
		</html>
	)
}
