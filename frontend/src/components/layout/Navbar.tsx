import Menu from '@/assets/icons/menu.svg'
import Logo from '@/assets/logo/logo.svg'
import { routes } from '@/helpers/routes'
import Link from 'next/link'
import NavLinks from './NavLinks'

export default function Navbar() {
	const links = [
		{ href: routes.explore, label: 'Entdecken' },
		{ href: routes.about, label: 'Über uns' },
	]

	return (
		<nav className="navbar bg-base-300 py-5 mb-4">
			<div className="container navbar-start">
				{/* Mobile Dropdown */}
				<div className="lg:hidden dropdown mr-4!">
					<div tabIndex={0} role="button" className="flex cursor-pointer">
						<Menu className="size-5" />
					</div>
					<ul
						tabIndex={-1}
						className="menu menu-md dropdown-content bg-base-100 border border-primary rounded-box z-10 mt-3 w-56 p-4"
					>
						<NavLinks links={links} variant="mobile" />
					</ul>
				</div>
				{/* Mobile Dropdown End */}

				{/* Logo */}
				<Link
					href={routes.explore}
					prefetch={false}
					className="flex items-center gap-3 lg:mr-12 mr-auto"
				>
					<Logo className="h-10 w-auto" />
					<span className="text-lg sm:text-xl font-bold">
						Dönerguide Stuttgart
					</span>
				</Link>
				{/* Logo End */}

				<ul className="hidden lg:flex lg:gap-4">
					<NavLinks links={links} variant="desktop" />
				</ul>
			</div>
		</nav>
	)
}
