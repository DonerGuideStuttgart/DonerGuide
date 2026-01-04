'use client'

import InfoCircle from '@/assets/icons/infocircle.svg'
import XCircle from '@/assets/icons/xcircle.svg'
import { routes } from '@/helpers/routes'
import Link from 'next/link'

export default function ErrorPage({ reset }: { reset: () => void }) {
	return (
		<main className="container mt-10 md:mt-20">
			{/* Icon */}
			<XCircle className="size-16 fill-error mb-4" />

			{/* Heading */}
			<div className="space-y-2 mb-6">
				<h1 className="text-2xl lg:text-3xl font-bold text-primary">
					Der Döner ist vom Spieß gefallen!
				</h1>
				<p className="text-xl">Da ist wohl etwas schiefgelaufen...</p>
			</div>

			{/* Suggestions */}
			<div className="flex items-start gap-3 mb-6">
				<InfoCircle className="size-5 fill-primary mt-0.5" />
				<div>
					<p className="font-semibold text-primary mb-2">
						Was könnte das Problem sein?
					</p>
					<ul className="space-y-2 text-sm text-neutral">
						<li>• Serververbindung unterbrochen</li>
						<li>• Technisches Problem beim Laden der Daten</li>
						<li>• Dein Browser hat den Hunger verloren</li>
						<li>• Die Döner-Datenbank macht Mittagspause</li>
					</ul>
				</div>
			</div>

			{/* Buttons */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
				<button
					onClick={reset}
					className="flex items-center justify-center cursor-pointer bg-secondary text-white rounded-full shadow-[0_3px_0px_#b54615] active:shadow-none active:translate-y-0.5 py-1.5 px-6 md:max-w-max"
				>
					Nochmal versuchen
				</button>
				<Link
					href={routes.explore}
					className="link link-primary link-hover text-center w-full sm:w-auto"
				>
					Zurück zur Startseite
				</Link>
			</div>
		</main>
	)
}
