'use client'

import ChipsFilterBar from '@/components/ChipsFilterBar'
import DonerCard, { DonerCardSkeleton } from '@/components/DonerCard'
import Drawer from '@/components/Drawer'
import FilterPanel from '@/components/FilterPanel'
import SortControl from '@/components/SortControl'
import { useState } from 'react'
import { INITIAL_LIMIT, LOAD_MORE_COUNT } from './searchParams'
import { useExplore } from './useExplore'

export default function Explore() {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)

	const {
		stores,
		error,
		loading,
		uiFilters,
		uiSort,
		handleFiltersChange,
		handleSortChange,
		handleLoadMore,
		handleRemoveFilter,
	} = useExplore()

	const title = `Entdecke ${stores.length == 0 ? 'die' : stores.length === 1 ? 'den' : 'die ' + stores.length} besten Döner in Stuttgart`

	return (
		<>
			{/* Header with Title */}
			<header className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">{title}</h1>
			</header>

			<section className="flex justify-end mb-4">
				<SortControl value={uiSort} onChange={handleSortChange} />
			</section>

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
