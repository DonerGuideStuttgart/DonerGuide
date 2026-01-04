import { routes } from '@/helpers/routes'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Über uns',
	description:
		'Erfahre mehr über Dönerguide Stuttgart, unsere Mission und unser Team.',
}

export default function Ueberuns() {
	return (
		<main className="container py-4">
			<h1 className="text-4xl font-bold mb-8">Über uns</h1>

			<section className="space-y-8 md:w-2/3">
				{/* Hero Section */}
				<div className="bg-white border border-primary rounded-xl p-8">
					<p className="text-xl leading-relaxed mb-2">
						Wir sind <strong>7 Studenten aus Stuttgart</strong>, die eines
						gemeinsam haben: eine tiefe Leidenschaft für Döner. 🥙
					</p>
					<p className="text-lg">
						Doch bei der Suche nach dem perfekten Döner haben wir festgestellt,
						dass herkömmliche Bewertungen oft zu subjektiv und unpräzise sind.
						<em> &quot;Schmeckt gut&quot;</em> oder{' '}
						<em>&quot;3 von 5 Sternen&quot;</em> sagen uns einfach nicht genug.
					</p>
				</div>

				{/* Mission */}
				<div>
					<h2 className="text-2xl font-semibold mb-2">🎯 Unsere Mission</h2>
					<p>
						Wir wollten mehr wissen: Wie ist das{' '}
						<strong>Fleisch-Salat-Verhältnis</strong>? Wie großzügig ist die{' '}
						<strong>Soße</strong>? Wie groß ist die <strong>Portion</strong>{' '}
						wirklich? DönerGuide Stuttgart wurde geboren, um diese Fragen mit
						Daten und KI zu beantworten.
					</p>
				</div>

				{/* How it works */}
				<div>
					<h2 className="flex items-center gap-2 text-2xl font-semibold">
						⚙️ Wie funktioniert DönerGuide?
					</h2>

					<div className="mt-6 grid gap-6 md:grid-cols-2">
						<div className="card bg-white border border-primary">
							<div className="card-body">
								<h3 className="card-title">📍 Entdeckung</h3>
								<p>
									Wir nutzen die <strong>Google Places API</strong>, um
									Döner-Imbisse in Stuttgart zu finden und deren
									Grundinformationen wie Standort, Öffnungszeiten, Fotos und
									vorhandene Bewertungen zu sammeln.
								</p>
							</div>
						</div>

						<div className="card bg-white border border-primary">
							<div className="card-body">
								<h3 className="card-title">📂 Datensammlung</h3>
								<p>
									Wir aggregieren Bilder, Nutzerbewertungen und
									Geschäftsinformationen aus verschiedenen Quellen, um ein
									vollständiges Bild jedes Imbisses zu erhalten.
								</p>
							</div>
						</div>

						<div className="card bg-white border border-primary">
							<div className="card-body">
								<h3 className="card-title">🤖 KI-Analyse</h3>
								<p>
									Ein <strong>Large Language Model</strong> analysiert die
									gesammelten Daten und Bewertungen, um präzise Eigenschaften zu
									ermitteln: Fleischanteil, Soßenmenge, Portionsgröße und mehr.
								</p>
							</div>
						</div>

						<div className="card bg-white border border-primary">
							<div className="card-body">
								<h3 className="card-title">📊 Objektive Scores</h3>
								<p>
									Aus allen gesammelten Daten berechnen wir einen{' '}
									<strong>DönerGuide Score</strong> eine datenbasierte,
									nachvollziehbare Bewertung für jeden Imbiss.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* What we analyze */}
				<div>
					<h2 className="text-2xl font-semibold mb-4">
						🔍 Was wir analysieren
					</h2>
					<div className="flex flex-wrap gap-3">
						{[
							'Fleischanteil',
							'Soßenmenge',
							'Portionsgröße',
							'Wartezeit',
							'Preis',
							'Gesamtscore',
						].map((item) => (
							<span
								key={item}
								className="badge badge-primary rounded-full badge-lg"
							>
								{item}
							</span>
						))}
					</div>
				</div>

				{/* Team */}
				<div>
					<h2 className="text-2xl font-semibold mb-4">👥 Das Team</h2>
					<p>
						Wir sind 7 Computer Science and Media Studenten aus Stuttgart, die
						ihre Leidenschaft für gutes Essen mit ihrem technischen Know-how
						verbinden. Was als Semesterprojekt begann, ist mittlerweile zu einer
						Mission geworden: Den Stuttgartern helfen, den besten Döner der
						Stadt zu finden.
					</p>
					<div className="mt-4 flex justify-center">
						<div className="flex -space-x-2">
							{[...Array(7)].map((_, i) => (
								<div
									key={i}
									className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-base-100 bg-primary text-lg font-bold text-primary-content"
								>
									{['I', 'A', 'K', 'A', 'J', 'K', 'J'][i]}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* CTA */}
				<div className="flex flex-col items-center rounded-xl bg-base-200 p-8 text-center gap-2">
					<h2 className="text-2xl font-semibold">
						🚀 Bereit für den besten Döner?
					</h2>
					<p className="mb-2">
						Entdecke die Döner Imbisse in Stuttgart mit objektiven,
						KI-gestützten Bewertungen.
					</p>
					<Link
						href={routes.explore}
						className="flex items-center justify-center cursor-pointer bg-primary text-white rounded-full shadow-[0_3px_0px_#000] active:shadow-none active:translate-y-0.5 py-1.5 px-6 md:max-w-max"
					>
						Döner entdecken
					</Link>
				</div>
			</section>
		</main>
	)
}
