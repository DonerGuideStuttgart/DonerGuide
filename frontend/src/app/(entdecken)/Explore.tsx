'use client'

import { useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'

import ChipsFilterBar from '@/components/ChipsFilterBar'
import DonerCard, {
	DonerCardSkeleton,
	type StoreSummary,
} from '@/components/DonerCard'
import Drawer from '@/components/Drawer'
import FilterPanel from '@/components/FilterPanel'
import SortControl from '@/components/SortControl'
import { buildStoreQuery, fetchPlaces } from '@/helpers/api'
import type { FilterParams } from '@/types/store'
import { exploreParsers, INITIAL_LIMIT, LOAD_MORE_COUNT } from './searchParams'

const DEBOUNCE_MS = 300

export default function Explore() {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)

	// Data state
	const [stores, setStores] = useState<StoreSummary[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	// URL state (source of truth)
	const [urlParams, setUrlParams] = useQueryStates(exploreParsers)

	// Convert URL params to FilterParams
	const urlFilters: FilterParams = useMemo(
		() => ({
			limit: urlParams.limit,
			offset: urlParams.offset,
			min_score: urlParams.min_score ?? undefined,
			max_score: urlParams.max_score ?? undefined,
			price_min: urlParams.price_min ?? undefined,
			price_max: urlParams.price_max ?? undefined,
			district: urlParams.district?.length ? urlParams.district : undefined,
			open_hours: urlParams.open_hours?.length
				? urlParams.open_hours
				: undefined,
			vegetarian: urlParams.vegetarian ?? undefined,
			halal: urlParams.halal ?? undefined,
			sauce_amount_min: urlParams.sauce_amount_min ?? undefined,
			sauce_amount_max: urlParams.sauce_amount_max ?? undefined,
			meat_ratio_min: urlParams.meat_ratio_min ?? undefined,
			meat_ratio_max: urlParams.meat_ratio_max ?? undefined,
			waiting_time: urlParams.waiting_time ?? undefined,
			payment_methods: urlParams.payment_methods ?? undefined,
		}),
		[urlParams],
	)

	// UI state (for immediate user feedback before debounce)
	const [uiFilters, setUiFilters] = useState<FilterParams>(urlFilters)
	const [uiSort, setUiSort] = useState<string>(urlParams.sort)

	// Refs for debouncing and request deduplication
	const debounceTimerRef = useRef<number | undefined>(undefined)
	const requestIdRef = useRef(0)

	// Fetch data from backend
	async function fetchData(filters: FilterParams, sort: string) {
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
		} catch (err) {
			if (currentRequestId !== requestIdRef.current) return
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			if (currentRequestId === requestIdRef.current) {
				setLoading(false)
			}
		}
	}

	// Convert FilterParams to URL params
	function filtersToUrlParams(filters: FilterParams, sort: string) {
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

	// Update URL and fetch (debounced)
	function updateFiltersDebounced(filters: FilterParams, sort: string) {
		// Clear existing timer
		if (debounceTimerRef.current !== undefined) {
			window.clearTimeout(debounceTimerRef.current)
		}

		// Set new timer
		debounceTimerRef.current = window.setTimeout(() => {
			setUrlParams(filtersToUrlParams(filters, sort))
			void fetchData(filters, sort)
		}, DEBOUNCE_MS)
	}

	// Update URL and fetch (immediate)
	function updateFiltersImmediate(filters: FilterParams, sort: string) {
		// Clear any pending debounced updates
		if (debounceTimerRef.current !== undefined) {
			window.clearTimeout(debounceTimerRef.current)
			debounceTimerRef.current = undefined
		}

		setUrlParams(filtersToUrlParams(filters, sort))
		void fetchData(filters, sort)
	}

	// Initial fetch on mount
	useEffect(() => {
		void fetchData(urlFilters, urlParams.sort)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Sync UI state when URL changes externally (e.g., browser back/forward)
	useEffect(() => {
		setUiFilters(urlFilters)
		setUiSort(urlParams.sort)
	}, [urlFilters, urlParams.sort])

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current !== undefined) {
				window.clearTimeout(debounceTimerRef.current)
			}
		}
	}, [])

	function handleFiltersChange(newFilters: FilterParams) {
		// Reset pagination when filters change
		const filtersWithReset = { ...newFilters, offset: 0, limit: INITIAL_LIMIT }
		setUiFilters(filtersWithReset)
		updateFiltersDebounced(filtersWithReset, uiSort)
	}

	function handleSortChange(newSort: string) {
		setUiSort(newSort)
		// Reset pagination when sort changes
		const filtersWithReset = { ...uiFilters, offset: 0, limit: INITIAL_LIMIT }
		setUiFilters(filtersWithReset)
		updateFiltersDebounced(filtersWithReset, newSort)
	}

	function handleLoadMore() {
		// Use current stores length as offset, load LOAD_MORE_COUNT more items
		const newOffset = stores.length
		const filtersWithPagination = {
			...uiFilters,
			offset: newOffset,
			limit: LOAD_MORE_COUNT,
		}
		setUiFilters(filtersWithPagination)
		updateFiltersImmediate(filtersWithPagination, uiSort)
	}

	function handleRemoveFilter(
		key: keyof FilterParams | (keyof FilterParams)[],
		value?: string,
	) {
		let newFilters = { ...uiFilters }

		// Handle multiple keys at once
		if (Array.isArray(key)) {
			for (const k of key) {
				newFilters = { ...newFilters, [k]: undefined } as FilterParams
			}
		} else if (value && (key === 'district' || key === 'open_hours')) {
			// Remove one element from array fields
			const currentArr = (uiFilters[key] ?? []) as string[]
			const nextArr = currentArr.filter((v) => String(v) !== value)
			newFilters = {
				...newFilters,
				[key]: nextArr.length ? nextArr : undefined,
			} as FilterParams
		} else {
			// Reset single field
			newFilters = { ...newFilters, [key]: undefined } as FilterParams
		}

		handleFiltersChange(newFilters)
	}

	return (
		<>
			<header className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">
					Entdecke{' '}
					{stores.length == 0
						? 'die'
						: stores.length === 1
							? 'den'
							: 'die ' + stores.length}{' '}
					besten Döner in Stuttgart
				</h1>
			</header>

			<SortControl value={uiSort} onChange={handleSortChange} />

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="hidden md:block md:col-span-1">
					<FilterPanel value={uiFilters} onChange={handleFiltersChange} />
				</div>

				<div className="md:col-span-3 space-y-3">
					<div className="flex items-center gap-2 text-base-300">
						<button
							onClick={() => setIsDrawerOpen(true)}
							className="md:hidden flex items-center gap-2 px-4 py-2 bg-amber-950 hover:bg-amber-900 rounded-lg transition-colors"
							aria-label="Open filters"
						>
							<span>Filter</span>
						</button>

						<div className="flex-1">
							<ChipsFilterBar
								filters={uiFilters}
								onRemove={handleRemoveFilter}
							/>
						</div>
					</div>

					{error && <div className="text-red-600">{error}</div>}

					{loading && stores.length === 0 ? (
						<>
							{Array.from({ length: INITIAL_LIMIT }).map((_, i) => (
								<DonerCardSkeleton key={i} />
							))}
						</>
					) : (
						<>
							{stores.map((s) => (
								<DonerCard key={s.id} store={s} />
							))}
							{loading &&
								Array.from({ length: LOAD_MORE_COUNT }).map((_, i) => (
									<DonerCardSkeleton key={`loading-${i}`} />
								))}
						</>
					)}

					<div className="pt-2">
						<button
							className="btn btn-outline w-full"
							disabled={loading}
							onClick={handleLoadMore}
						>
							Mehr laden
						</button>
					</div>
				</div>
			</div>

			<Drawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				title="Filter"
			>
				<FilterPanel value={uiFilters} onChange={handleFiltersChange} />
			</Drawer>
		</>
	)
}
