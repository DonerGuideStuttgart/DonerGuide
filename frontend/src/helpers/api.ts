export function buildStoreQuery(
	filters: Record<string, unknown>,
	sort?: string,
) {
	const params = new URLSearchParams()
	for (const k of Object.keys(filters)) {
		const v = filters[k]
		if (v === undefined || v === null || v === '') continue
		params.set(k, String(v))
	}
	if (sort) params.set('sort', sort)
	return params.toString()
}

export async function fetchPlaces(query: string) {
	const base = process.env.NEXT_PUBLIC_API_URL || '/api' // default to local proxy
	const url = `${base}/places${query ? `?${query}` : ''}`
	const res = await fetch(url)
	if (!res.ok) throw new Error('Failed to fetch places')
	return await res.json()
}

export async function fetchPlaceById(id: string) {
	const base = process.env.NEXT_PUBLIC_API_URL || '/api'
	const res = await fetch(`${base}/places/${id}`)
	if (!res.ok) throw new Error('Failed to fetch place')
	return await res.json()
}
