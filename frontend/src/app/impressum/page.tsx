import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Impressum',
	description:
		'Impressum von Dönerguide Stuttgart mit rechtlichen Informationen und Kontaktangaben.',
}

export default function Imprint() {
	return (
		<main className="container py-12">
			<h1 className="mb-8 text-4xl font-bold">Impressum</h1>

			<section className="space-y-8 md:w-2/3">
				<div>
					<h2 className="text-2xl font-semibold">Angaben gemäß § 5 TMG</h2>
					<p>
						Hochschule der Medien Stuttgart
						<br />
						Nobelstraße 10
						<br />
						70569 Stuttgart
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">Kontakt</h2>
					<p>
						E-Mail:{' '}
						<a
							href="mailto:kontakt@donerguide-stuttgart.de"
							className="link link-primary"
						>
							kontakt@donerguide-stuttgart.de
						</a>
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">
						Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
					</h2>
					<p>
						Hochschule der Medien Stuttgart
						<br />
						Nobelstraße 10
						<br />
						70569 Stuttgart
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">Haftungsausschluss</h2>

					<h3 className="mt-4 text-xl font-medium">Haftung für Inhalte</h3>
					<p>
						Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für
						die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können
						wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir
						gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
						allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
						als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
						gespeicherte fremde Informationen zu überwachen oder nach Umständen
						zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
					</p>

					<h3 className="mt-4 text-xl font-medium">Haftung für Links</h3>
					<p>
						Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren
						Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
						fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
						verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
						der Seiten verantwortlich.
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">Urheberrecht</h2>
					<p>
						Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
						diesen Seiten unterliegen dem deutschen Urheberrecht. Die
						Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
						Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
						schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">Streitschlichtung</h2>
					<p>
						Die Europäische Kommission stellt eine Plattform zur
						Online-Streitbeilegung (OS) bereit:{' '}
						<a
							href="https://ec.europa.eu/consumers/odr/"
							target="_blank"
							rel="noopener noreferrer"
							className="link link-primary"
						>
							https://ec.europa.eu/consumers/odr/
						</a>
						<br />
						Wir sind nicht bereit oder verpflichtet, an
						Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
						teilzunehmen.
					</p>
				</div>
			</section>
		</main>
	)
}
