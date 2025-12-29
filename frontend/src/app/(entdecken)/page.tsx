'use client'
import { useEffect, useState, useRef } from 'react'

import FilterPanel, {
	Filters,
	FilterPanelHandle,
} from '@/components/FilterPanel'
import SortControl from '@/components/SortControl'
import DonerCard, { StoreSummary } from '@/components/DonerCard'
import { buildStoreQuery, fetchPlaces } from '@/helpers/api'
import ChipsFilterBar from '@/components/ChipsFilterBar'
import Drawer from '@/components/Drawer'

export default function StoresPage() {
	const [filters, setFilters] = useState<Filters>({ limit: 20, offset: 0 })
	const filterPanelRef = useRef<FilterPanelHandle>(null)
	const [sort, setSort] = useState<string>('')
	const [stores, setStores] = useState<StoreSummary[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)

	useEffect(() => {
		let mounted = true
		async function load() {
			setLoading(true)
			setError(null)
			try {
				const q = buildStoreQuery(filters, sort)
				console.debug('[StoresPage] fetch query:', q)
				const payload = await fetchPlaces(q)
				console.debug('[StoresPage] fetch payload:', payload)
				const items = Array.isArray(payload.items) ? payload.items : []
				if (!mounted) return
				setStores(items)
				console.debug('[StoresPage] normalized items:', items)
			} catch (e) {
				console.error('[StoresPage] fetch error:', e)
				setError(e instanceof Error ? e.message : 'Unknown error')
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => {
			mounted = false
		}
	}, [filters, sort])

	function handleRemoveFilter(
		key: keyof Filters | (keyof Filters)[],
		value?: string,
	) {
		if (filterPanelRef.current) {
			filterPanelRef.current.removeFilter(key, value)
		}
	}

	return (
		<main className="container mx-auto p-4">
			<header className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">Dönerläden</h1>
				<SortControl value={sort} onChange={setSort} />
			</header>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="hidden md:block md:col-span-1">
					<FilterPanel
						onChange={(f) => setFilters(f)}
						initial={filters}
						ref={filterPanelRef}
					/>
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
							<ChipsFilterBar filters={filters} onRemove={handleRemoveFilter} />
						</div>
					</div>

					{loading && <div>Loading…</div>}
					{error && <div className="text-red-600">{error}</div>}
					{/* Stores */}
					{stores.map((s) => (
						<DonerCard key={s.id} store={s} />
					))}
				</div>
			</div>

			<Drawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				title="Filter"
			>
				<FilterPanel
					onChange={(f) => setFilters(f)}
					initial={filters}
					ref={filterPanelRef}
				/>
			</Drawer>
		</main>
	)
}
