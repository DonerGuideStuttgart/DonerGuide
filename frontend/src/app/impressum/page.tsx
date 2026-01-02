import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Impressum',
	description:
		'Impressum von Dönerguide Stuttgart mit rechtlichen Informationen und Kontaktangaben.',
}

export default function Imprint() {
	return (
		<header>
			<h1>Impressum Döner</h1>
			<button className="btn btn-primary">Test</button>
		</header>
	)
}
