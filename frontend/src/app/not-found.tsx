import InfoCircle from '@/assets/icons/infocircle.svg'
import XCircle from '@/assets/icons/xcircle.svg'
import { routes } from '@/helpers/routes'
import Link from 'next/link'

export default function NotFound() {
	return (
		<main className="container mt-10 md:mt-20">
			{/* Icon */}
			<XCircle className="size-16 fill-secondary mb-4" />

			{/* Heading */}
			<div className="space-y-2 mb-6">
				<h1 className="text-2xl lg:text-3xl font-bold text-primary">
					Dieser Döner ist leider ausverkauft!
				</h1>
				<p className="text-xl">Error 404 - Seite nicht gefunden</p>
			</div>

			{/* Suggestions */}
			<div className="flex items-start gap-3">
				<InfoCircle className="size-5 fill-primary mt-0.5" />
				<div>
					<p className="font-semibold text-primary mb-2">
						Was könnte schiefgelaufen sein?
					</p>
					<ul className="space-y-2 text-sm text-neutral">
						<li>• Die URL wurde falsch eingegeben</li>
						<li>• Der Döner-Laden wurde bereits geschlossen</li>
						<li>• Die Seite existiert nicht (mehr)</li>
						<li>• Ein Link war fehlerhaft</li>
					</ul>
				</div>
			</div>

			{/* Button */}
			<div className="pt-4">
				<Link
					href={routes.explore}
					prefetch={false}
					className="flex items-center justify-center cursor-pointer bg-secondary text-white rounded-full shadow-[0_3px_0px_#b54615] active:shadow-none active:translate-y-0.5 py-1.5 px-6 md:max-w-max"
				>
					Zurück zur Startseite
				</Link>
			</div>
		</main>
	)
}
