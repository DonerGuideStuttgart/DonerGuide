import Link from 'next/link'

export default function Footer() {
	const links = [
		{ href: '/impressum', label: 'Impressum' },
		{ href: '/datenschutz', label: 'Datenschutz' },
		{ href: '/kontakt', label: 'Kontakt' },
	]

	return (
		<footer className="border-t border-base py-4">
			<div className="container flex flex-col md:flex-row items-center justify-between">
				<aside className="mb-4 md:mb-0">
					<p>Dönerguide © {new Date().getFullYear()}</p>
				</aside>

				<nav className="flex flex-col items-center lg:flex-row gap-2 lg:gap-4">
					{links.map((link) => (
						<Link key={link.href} href={link.href} className="link link-hover">
							{link.label}
						</Link>
					))}
				</nav>
			</div>
		</footer>
	)
}
