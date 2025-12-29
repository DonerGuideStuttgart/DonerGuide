import { routes } from '@/helpers/routes'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from './NavLinks'

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
					<div tabIndex={0} role="button" className="flex">
						<Image
							src="/icons/menu.svg"
							alt="Menu"
							preload
							width={18}
							height={18}
						/>
					</div>
					<ul
						tabIndex={-1}
						className="menu menu-md dropdown-content bg-base-100 border-2 border-primary rounded-box border- z-1 mt-3 w-56 p-4"
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
						preload
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
