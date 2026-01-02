'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type LinkItem = { href: string; label: string }

export default function NavLinks({
	links,
	variant,
	className,
}: {
	links: LinkItem[]
	variant: 'mobile' | 'desktop'
	className?: string
}) {
	const pathname = usePathname()

	if (variant === 'mobile') {
		return (
			<ul tabIndex={-1} className={className}>
				{links.map((link) => {
					const active = link.href === pathname
					return (
						<li key={link.href} className="mb-1">
							<Link
								href={link.href}
								aria-current={active ? 'page' : undefined}
								className={
									active
										? 'bg-secondary text-white pointer-events-none'
										: 'hover:bg-neutral-content/30'
								}
							>
								{link.label}
							</Link>
						</li>
					)
				})}
			</ul>
		)
	}

	return (
		<ul className="flex gap-4">
			{links.map((link) => {
				const active = link.href === pathname
				return (
					<li key={link.href}>
						<Link
							href={link.href}
							aria-current={active ? 'page' : undefined}
							className={`hover:text-secondary-content ${
								active ? 'text-secondary-content pointer-events-none' : ''
							}`}
						>
							{link.label}
						</Link>
					</li>
				)
			})}
		</ul>
	)
}
