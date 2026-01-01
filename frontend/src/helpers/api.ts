import { FilterParams } from '@/types/store'

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
	const searchParameters = new URLSearchParams()

	const filterEntries = Object.entries(filters) as Array<
		[FilterKey, FilterParams[FilterKey]]
	>

	for (const [filterKey, filterValue] of filterEntries) {
		const queryStringValue = convertFilterValueToQueryString(filterValue)
		if (queryStringValue === null) {
			continue
		}
		searchParameters.set(filterKey, queryStringValue)
	}

	if (sort !== undefined && sort !== null && sort !== '') {
		searchParameters.set('sort', sort)
	}

	return searchParameters.toString()
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
