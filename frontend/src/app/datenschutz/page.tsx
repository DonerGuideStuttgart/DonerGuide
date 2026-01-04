import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Datenschutz',
	description:
		'Datenschutzerklärung von Dönerguide Stuttgart mit Informationen zum Umgang mit Nutzerdaten.',
}

export default function Datenschutz() {
	return (
		<main className="container py-12">
			<h1 className="mb-8 text-4xl font-bold">Datenschutzerklärung</h1>

			<section className="space-y-8 md:w-2/3">
				<div>
					<h2 className="text-2xl font-semibold">
						1. Datenschutz auf einen Blick
					</h2>

					<h3 className="mt-4 text-xl font-medium">Allgemeine Hinweise</h3>
					<p>
						Die folgenden Hinweise geben einen einfachen Überblick darüber, was
						mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website
						besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
						persönlich identifiziert werden können.
					</p>

					<h3 className="mt-4 text-xl font-medium">
						Datenerfassung auf dieser Website
					</h3>
					<p>
						<strong>Wer ist verantwortlich für die Datenerfassung?</strong>
						<br />
						Die Datenverarbeitung auf dieser Website erfolgt durch den
						Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum
						dieser Website entnehmen.
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">2. Hosting</h2>
					<p>
						Wir hosten die Inhalte unserer Website bei Microsoft Azure. Die
						Server befinden sich in Deutschland/Europa. Details entnehmen Sie
						der Datenschutzerklärung von Microsoft Azure:{' '}
						<a
							href="https://privacy.microsoft.com/de-de/privacystatement"
							target="_blank"
							rel="noopener noreferrer"
							className="link link-primary"
						>
							Microsoft Datenschutzerklärung
						</a>
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">
						3. Allgemeine Hinweise und Pflichtinformationen
					</h2>

					<h3 className="mt-4 text-xl font-medium">Datenschutz</h3>
					<p>
						Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen
						Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
						vertraulich und entsprechend den gesetzlichen
						Datenschutzvorschriften sowie dieser Datenschutzerklärung.
					</p>

					<h3 className="mt-4 text-xl font-medium">
						Hinweis zur verantwortlichen Stelle
					</h3>
					<p>
						Die verantwortliche Stelle für die Datenverarbeitung auf dieser
						Website ist:
					</p>
					<p>
						Hochschule der Medien Stuttgart
						<br />
						Nobelstraße 10
						<br />
						70569 Stuttgart
						<br />
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
						4. Datenerfassung auf dieser Website
					</h2>

					<h3 className="mt-4 text-xl font-medium">Server-Log-Dateien</h3>
					<p>
						Der Provider der Seiten erhebt und speichert automatisch
						Informationen in so genannten Server-Log-Dateien, die Ihr Browser
						automatisch an uns übermittelt. Dies sind:
					</p>
					<ul className="list-disc pl-6">
						<li>Browsertyp und Browserversion</li>
						<li>Verwendetes Betriebssystem</li>
						<li>Referrer URL</li>
						<li>Hostname des zugreifenden Rechners</li>
						<li>Uhrzeit der Serveranfrage</li>
						<li>IP-Adresse</li>
					</ul>
					<p>
						Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
						nicht vorgenommen.
					</p>

					<h3 className="mt-4 text-xl font-medium">Cookies</h3>
					<p>
						Unsere Website verwendet derzeit keine Cookies für Tracking-Zwecke.
						Sollten wir in Zukunft Cookies einsetzen, werden wir Sie darüber
						informieren und ggf. Ihre Einwilligung einholen.
					</p>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">5. Ihre Rechte</h2>
					<p>Sie haben jederzeit das Recht:</p>
					<ul className="list-disc pl-6">
						<li>
							Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten
							zu erhalten
						</li>
						<li>Berichtigung unrichtiger Daten zu verlangen</li>
						<li>Löschung Ihrer Daten zu verlangen</li>
						<li>Einschränkung der Verarbeitung zu verlangen</li>
						<li>Datenübertragbarkeit zu verlangen</li>
						<li>Sich bei einer Aufsichtsbehörde zu beschweren</li>
					</ul>
				</div>

				<div>
					<h2 className="text-2xl font-semibold">6. Externe Links</h2>
					<p>
						Unsere Website enthält Links zu externen Websites (z.B. Google Maps
						für Standortinformationen). Für die Datenschutzpraktiken dieser
						externen Websites sind wir nicht verantwortlich. Bitte informieren
						Sie sich auf den jeweiligen Seiten über deren
						Datenschutzbestimmungen.
					</p>
				</div>

				<p className="text-sm text-base-content/70">Stand: Januar 2026</p>
			</section>
		</main>
	)
}
