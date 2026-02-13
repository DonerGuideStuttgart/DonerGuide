import { FilterParams } from '@/types/store'
import { fetchPlaces, fetchPlaceById } from '@/helpers/api'

type FilterKey = keyof FilterParams

function convertFilterValueToQueryString(
	filterValue: FilterParams[FilterKey],
): string | null {
	if (filterValue === undefined || filterValue === null) {
		return null
	}

	if (Array.isArray(filterValue)) {
		if (filterValue.length === 0) {
			return null
		}
		return filterValue.join(',')
	}

	return String(filterValue)
}

export function buildStoreQuery(filters: FilterParams, sort?: string) {
	const searchParams = new URLSearchParams()

	const filterEntries = Object.entries(filters) as Array<
		[FilterKey, FilterParams[FilterKey]]
	>

	for (const [filterKey, filterValue] of filterEntries) {
		const queryStringValue = convertFilterValueToQueryString(filterValue)
		if (queryStringValue === null) {
			continue
		}
		searchParams.set(filterKey, queryStringValue)
	}

	if (sort !== undefined && sort !== null && sort !== '') {
		searchParams.set('sort', sort)
	}

	return searchParams.toString()
}

const fetchOptions: RequestInit = {
	next: { revalidate: 3600 }, // Revalidate every hour (adjust as needed)
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
	const res = await fetch(`${base}/places/${id}`, fetchOptions)
	if (!res.ok) throw new Error('Failed to fetch place')
	return await res.json()
}

export async function fetchPlaceBySlug(slug: string) {
	const base = process.env.NEXT_PUBLIC_API_URL || '/api'
	const res = await fetch(`${base}/places/by-slug/${slug}`, fetchOptions)
	if (res.status === 404) return null
	if (!res.ok) throw new Error('Failed to fetch place')
	return await res.json()
}

// Generate static paths for all stores at build time
export async function generateStaticParams() {
	try {
		const base = process.env.NEXT_PUBLIC_API_URL || '/api'
		// Fetch all stores without pagination to get all slugs
		const response = await fetch(`${base}/places?limit=1000`)
		if (!response.ok) {
			console.warn('Failed to fetch stores for static generation')
			return []
		}

		const data = await response.json()
		const stores = data.places || []

		console.log(`Generating static params for ${stores.length} stores`)

		return stores.map((store: { place_id: string }) => ({
			slug: store.place_id,
		}))
	} catch (error) {
		console.error('Error generating static params:', error)
		return []
	}
}
