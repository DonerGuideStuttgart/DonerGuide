import { fetchPlaceBySlug, fetchPlaces } from '@/helpers/api'
import { Store } from '@/types/store'
import { notFound } from 'next/navigation'

type Props = {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	const data = await fetchPlaces('')
	const places = data.items || []

	return places.map((place: Store) => ({
		slug: place.slug,
	}))
}

export default async function StoreDetail({ params }: Props) {
	const { slug } = await params

	const store: Store = await fetchPlaceBySlug(slug)

	if (!store) {
		return notFound()
	}

	return (
		<main className="max-w-5xl mx-auto p-4">
			<h1 className="text-2xl font-bold">{store.name}</h1>
			<p className="mt-2">{store.aiSummary}</p>
			{/* render more fields returned by backend */}
		</main>
	)
}
