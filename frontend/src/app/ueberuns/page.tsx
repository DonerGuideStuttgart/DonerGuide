import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Über uns',
	description:
		'Erfahre mehr über Dönerguide Stuttgart, unsere Mission und unser Team.',
}

export default function Ueberuns() {
	return (
		<header>
			<h1>Über Dönerguide Stuttgart</h1>
		</header>
	)
}
