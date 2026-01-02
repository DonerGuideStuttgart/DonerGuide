import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Kontakt',
	description:
		'Kontaktiere Dönerguide Stuttgart für Fragen, Feedback oder Kooperationen.',
}

export default function Contact() {
	return (
		<header>
			<h1>Kontakt Döner</h1>
			<button className="btn btn-primary">Test</button>
		</header>
	)
}
