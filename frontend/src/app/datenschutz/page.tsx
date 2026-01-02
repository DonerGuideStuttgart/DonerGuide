import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Datenschutz',
	description:
		'Datenschutzerklärung von Dönerguide Stuttgart mit Informationen zum Umgang mit Nutzerdaten.',
}

export default function Datenschutz() {
	return (
		<header>
			<h1>Datenschutz Döner</h1>
			<button className="btn btn-primary">Test</button>
		</header>
	)
}
