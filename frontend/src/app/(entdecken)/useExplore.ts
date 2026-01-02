'use client'
import type { StoreSummary } from '@/components/DonerCard'
import { buildStoreQuery, fetchPlaces } from '@/helpers/api'
import type { FilterParams } from '@/types/store'
import { useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	filtersToUrlParams,
	removeFilterValue,
	resetPagination,
	updatePaginationForLoadMore,
	urlParamsToFilters,
} from './exploreUtils'
import { exploreParsers, INITIAL_LIMIT, LOAD_MORE_COUNT } from './searchParams'

const DEBOUNCE_MS = 300

export function useExplore() {
	// Data state
	const [stores, setStores] = useState<StoreSummary[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)

	// URL state
	const [urlParams, setUrlParams] = useQueryStates(exploreParsers)

	// Convert URL params to FilterParams
	const urlFilters: FilterParams = useMemo(
		() => urlParamsToFilters(urlParams),
		[urlParams],
	)

	// UI state (for immediate user feedback before debounce)
	const [uiFilters, setUiFilters] = useState<FilterParams>(urlFilters)
	const [uiSort, setUiSort] = useState<string>(urlParams.sort)

	// Refs for debouncing and request deduplication
	const debounceTimerRef = useRef<number | undefined>(undefined)
	const requestIdRef = useRef(0)

	// Fetch data from backend
	const fetchData = useCallback(async (filters: FilterParams, sort: string) => {
		const currentRequestId = ++requestIdRef.current
		setLoading(true)
		setError(null)

		try {
			const queryString = buildStoreQuery(filters, sort)
			const payload = await fetchPlaces(queryString)
			const items = Array.isArray(payload.items) ? payload.items : []

			// Ignore stale requests
			if (currentRequestId !== requestIdRef.current) return

			// Append for pagination, replace otherwise
			setStores((prev) => (filters.offset > 0 ? [...prev, ...items] : items))

			// Check if there are more items to load
			// If we got fewer items than requested, there are no more
			const expectedCount = filters.offset > 0 ? LOAD_MORE_COUNT : INITIAL_LIMIT
			setHasMore(items.length >= expectedCount)
		} catch (err) {
			if (currentRequestId !== requestIdRef.current) return
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			if (currentRequestId === requestIdRef.current) {
				setLoading(false)
			}
		}
	}, [])

	// Update URL and fetch (debounced)
	const updateFiltersDebounced = useCallback(
		async (filters: FilterParams, sort: string) => {
			if (debounceTimerRef.current !== undefined) {
				window.clearTimeout(debounceTimerRef.current)
			}

			debounceTimerRef.current = window.setTimeout(async () => {
				await setUrlParams(filtersToUrlParams(filters, sort))
			}, DEBOUNCE_MS)
		},
		[setUrlParams],
	)

	// Update URL and fetch (immediate)
	const updateFiltersImmediate = useCallback(
		async (filters: FilterParams, sort: string) => {
			if (debounceTimerRef.current !== undefined) {
				window.clearTimeout(debounceTimerRef.current)
				debounceTimerRef.current = undefined
			}
			await setUrlParams(filtersToUrlParams(filters, sort))
		},
		[setUrlParams],
	)

	// Initial fetch on mount
	const isInitialMount = useRef(true)
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false
			// Reset offset to 0 on initial mount to avoid showing only partial results
			const initialFilters = { ...urlFilters, offset: 0, limit: INITIAL_LIMIT }
			setUiFilters(initialFilters)
			void fetchData(initialFilters, urlParams.sort)
			// Update URL if offset was non-zero
			if (urlFilters.offset > 0) {
				void setUrlParams(filtersToUrlParams(initialFilters, urlParams.sort))
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Sync UI state and fetch when URL changes externally
	useEffect(() => {
		if (isInitialMount.current) return

		setUiFilters(urlFilters)
		setUiSort(urlParams.sort)
		void fetchData(urlFilters, urlParams.sort)
	}, [urlFilters, urlParams.sort, fetchData])

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current !== undefined) {
				window.clearTimeout(debounceTimerRef.current)
			}
		}
	}, [])

	// Handlers
	const handleFiltersChange = useCallback(
		(newFilters: FilterParams) => {
			const filtersWithReset = resetPagination(newFilters, INITIAL_LIMIT)
			setUiFilters(filtersWithReset)
			updateFiltersDebounced(filtersWithReset, uiSort)
		},
		[uiSort, updateFiltersDebounced],
	)

	const handleSortChange = useCallback(
		(newSort: string) => {
			setUiSort(newSort)
			const filtersWithReset = resetPagination(uiFilters, INITIAL_LIMIT)
			setUiFilters(filtersWithReset)
			updateFiltersImmediate(filtersWithReset, newSort)
		},
		[uiFilters, updateFiltersImmediate],
	)

	const handleLoadMore = useCallback(() => {
		const filtersWithPagination = updatePaginationForLoadMore(
			uiFilters,
			stores.length,
			LOAD_MORE_COUNT,
		)
		setUiFilters(filtersWithPagination)
		updateFiltersImmediate(filtersWithPagination, uiSort)
	}, [uiFilters, uiSort, stores.length, updateFiltersImmediate])

	const handleRemoveFilter = useCallback(
		(key: keyof FilterParams | (keyof FilterParams)[], value?: string) => {
			const newFilters = removeFilterValue(uiFilters, key, value)
			handleFiltersChange(newFilters)
		},
		[uiFilters, handleFiltersChange],
	)

	const handleResetAllFilters = useCallback(() => {
		const resetFilters = resetPagination({} as FilterParams, INITIAL_LIMIT)
		const resetSort = ''

		setUiSort(resetSort)
		setUiFilters(resetFilters)
		updateFiltersImmediate(resetFilters, resetSort)
	}, [updateFiltersImmediate])

	return {
		// State
		stores,
		error,
		loading,
		uiFilters,
		uiSort,
		hasMore,

		// Handlers
		handleFiltersChange,
		handleSortChange,
		handleLoadMore,
		handleRemoveFilter,
		handleResetAllFilters,
	}
}
