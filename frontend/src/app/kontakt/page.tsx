import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Kontakt',
	description:
		'Kontaktiere Dönerguide Stuttgart für Fragen, Feedback oder Kooperationen.',
}

export default function Contact() {
	return (
		<main className="container py-12">
			<h1 className="mb-8 text-4xl font-bold">Kontakt</h1>

			<section className="md:w-2/3">
				<p className="mb-6 text-lg">
					Du hast Fragen, Feedback oder möchtest mit uns zusammenarbeiten? Wir
					freuen uns von dir zu hören!
				</p>

				<div className="card bg-white border border-primary mb-8">
					<div className="card-body">
						<h2 className="card-title text-xl">E-Mail</h2>
						<p>
							Für allgemeine Anfragen erreichst du uns unter:
							<br />
							<a
								href="mailto:kontakt@donerguide-stuttgart.de"
								className="link link-primary font-semibold"
							>
								kontakt@donerguide-stuttgart.de
							</a>
						</p>
					</div>
				</div>

				<div className="card bg-white border border-primary mb-8">
					<div className="card-body">
						<h2 className="card-title text-xl">Kooperationen</h2>
						<p>
							Du betreibst einen Döner-Imbiss in Stuttgart und möchtest
							aufgenommen werden? Oder du hast eine Idee für eine
							Zusammenarbeit? Schreib uns!
						</p>
					</div>
				</div>

				<div className="card bg-white border border-primary mb-8">
					<div className="card-body">
						<h2 className="card-title text-xl">Fehler melden</h2>
						<p>
							Dir ist ein Fehler aufgefallen oder Informationen zu einem Imbiss
							sind nicht korrekt? Lass es uns wissen, damit wir es verbessern
							können.
						</p>
					</div>
				</div>

				<div className="card bg-white border border-primary mb-8">
					<div className="card-body">
						<h2 className="card-title text-xl">Feedback</h2>
						<p>
							Wir sind immer offen für Verbesserungsvorschläge und neue Ideen.
							Teile uns mit, was du dir von DönerGuide wünschst!
						</p>
					</div>
				</div>
			</section>
		</main>
	)
}
