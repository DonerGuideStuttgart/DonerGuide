import { Store } from '@/types/store'

type Props = { params: { id: string } }

export default async function StoreDetail({ params }: Props) {
	const id = params.id
	let store: Store | null = null
	try {
		const res = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/places/${id}`,
		)
		if (res.ok) store = await res.json()
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (e) {
		// ignore
	}

	if (!store) {
		return <main className="max-w-5xl mx-auto p-4">Store not found.</main>
	}

	return (
		<main className="max-w-5xl mx-auto p-4">
			<h1 className="text-2xl font-bold">{store.name}</h1>
			<p className="mt-2">{store.ai_summary}</p>
			{/* render more fields returned by backend */}
		</main>
	)
}
