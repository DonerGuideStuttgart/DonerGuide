import { routes } from '@/helpers/routes'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from './NavLinks'
import Menu from '@/assets/icons/menu.svg'

export default function Navbar() {
	const links = [
		{ href: routes.explore, label: 'Entdecken' },
		{ href: routes.about, label: 'Über uns' },
	]

	return (
		<nav className="navbar bg-base-300">
			<div className="container navbar-start">
				{/* Mobile Dropdown */}
				<div className="lg:hidden dropdown mr-auto">
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
					className="flex items-center gap-3 lg:mr-12 mr-auto"
				>
					<Image
						src="/logo/logo.svg"
						alt="Dönerguide Logo"
						priority
						width={20}
						height={20}
					/>
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
