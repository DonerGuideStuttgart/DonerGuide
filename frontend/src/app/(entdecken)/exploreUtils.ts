/**
 * Utility functions for the explore page
 * Handles filter/URL conversion, filter manipulation, and pagination
 */

import type { FilterParams } from '@/types/store'

/**
 * Convert FilterParams to URL query parameters
 */
export function filtersToUrlParams(filters: FilterParams, sort: string) {
	return {
		limit: filters.limit,
		offset: filters.offset,
		min_score: filters.min_score ?? null,
		max_score: filters.max_score ?? null,
		price_min: filters.price_min ?? null,
		price_max: filters.price_max ?? null,
		district: filters.district?.length ? filters.district : null,
		open_hours: filters.open_hours?.length ? filters.open_hours : null,
		vegetarian: filters.vegetarian ?? null,
		halal: filters.halal ?? null,
		sauce_amount_min: filters.sauce_amount_min ?? null,
		sauce_amount_max: filters.sauce_amount_max ?? null,
		meat_ratio_min: filters.meat_ratio_min ?? null,
		meat_ratio_max: filters.meat_ratio_max ?? null,
		waiting_time: filters.waiting_time ?? null,
		payment_methods: filters.payment_methods ?? null,
		sort,
	}
}

/**
 * Convert URL query parameters to FilterParams
 */
export function urlParamsToFilters(urlParams: {
	limit: number
	offset: number
	min_score: number | null
	max_score: number | null
	price_min: number | null
	price_max: number | null
	district: string[] | null
	open_hours: string[] | null
	vegetarian: string[] | null
	halal: string[] | null
	sauce_amount_min: number | null
	sauce_amount_max: number | null
	meat_ratio_min: number | null
	meat_ratio_max: number | null
	waiting_time: string[] | null
	payment_methods: string[] | null
}): FilterParams {
	return {
		limit: urlParams.limit,
		offset: urlParams.offset,
		min_score: urlParams.min_score ?? undefined,
		max_score: urlParams.max_score ?? undefined,
		price_min: urlParams.price_min ?? undefined,
		price_max: urlParams.price_max ?? undefined,
		district: urlParams.district?.length ? urlParams.district : undefined,
		open_hours: urlParams.open_hours?.length ? urlParams.open_hours : undefined,
		vegetarian: urlParams.vegetarian?.length ? urlParams.vegetarian : undefined,
		halal: urlParams.halal?.length ? urlParams.halal : undefined,
		sauce_amount_min: urlParams.sauce_amount_min ?? undefined,
		sauce_amount_max: urlParams.sauce_amount_max ?? undefined,
		meat_ratio_min: urlParams.meat_ratio_min ?? undefined,
		meat_ratio_max: urlParams.meat_ratio_max ?? undefined,
		waiting_time: urlParams.waiting_time?.length
			? urlParams.waiting_time
			: undefined,
		payment_methods: urlParams.payment_methods?.length
			? urlParams.payment_methods
			: undefined,
	}
}

/**
 * Remove a filter value from FilterParams
 */
export function removeFilterValue(
	filters: FilterParams,
	key: keyof FilterParams | (keyof FilterParams)[],
	value?: string,
): FilterParams {
	let newFilters = { ...filters }

	// Handle multiple keys at once
	if (Array.isArray(key)) {
		for (const k of key) {
			newFilters = { ...newFilters, [k]: undefined } as FilterParams
		}
	} else if (value !== undefined && Array.isArray(filters[key])) {
		// Remove one element from array field
		const currentArr = filters[key] as string[]
		const nextArr = currentArr.filter((v) => String(v) !== value)
		newFilters = {
			...newFilters,
			[key]: nextArr.length ? nextArr : undefined,
		} as FilterParams
	} else {
		// Reset field
		newFilters = { ...newFilters, [key]: undefined } as FilterParams
	}

	return newFilters
}

/**
 * Reset pagination to initial values
 */
export function resetPagination(
	filters: FilterParams,
	initialLimit: number,
): FilterParams {
	return { ...filters, offset: 0, limit: initialLimit }
}

/**
 * Update pagination for load more
 */
export function updatePaginationForLoadMore(
	filters: FilterParams,
	currentLength: number,
	loadMoreCount: number,
): FilterParams {
	return {
		...filters,
		offset: currentLength,
		limit: loadMoreCount,
	}
}
