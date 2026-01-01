'use client'

import DonerCard, { DonerCardSkeleton } from '@/components/DonerCard'
import Drawer from '@/components/Drawer'
import FilterChips from '@/components/FilterChips'
import FilterPanel from '@/components/FilterPanel'
import Sort from '@/components/Sort'
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
		handleFiltersChange,
		handleLoadMore,
		handleResetAllFilters,
	} = useExplore()

	const title = `Entdecke ${
		stores.length == 0
			? 'die'
			: stores.length === 1
				? 'den'
				: 'die ' + stores.length
	} besten Döner in Stuttgart`

	return (
		<>
			{/* Header with Title */}
			<header className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">{title}</h1>
			</header>

			{/* Sort */}
			<section className="flex justify-end mb-2">
				<Sort />
			</section>

			<section className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{/* Filter Desktop */}
				<div className="hidden md:block md:col-span-1">
					<section className="flex justify-between text-sm mb-1">
						<p>{stores.length} Döner</p>

						<button className="link link-hover" onClick={handleResetAllFilters}>
							Filter zurücksetzen
						</button>
					</section>

					<FilterPanel value={uiFilters} onChange={handleFiltersChange} />
				</div>
				{/* Filter Desktop End */}

				<div className="md:col-span-3 space-y-3">
					{/* Filter Mobile */}
					<div className="flex items-center gap-2 text-base-300">
						<button
							onClick={() => setIsDrawerOpen(true)}
							className="md:hidden flex items-center gap-2 px-4 py-2 bg-amber-950 hover:bg-amber-900 rounded-lg transition-colors"
							aria-label="Open filters"
						>
							<span>Filter</span>
						</button>
						{/* Filter Mobile End */}

						{/* Filter Chips */}
						<section>
							<FilterChips />
						</section>
						{/* Filter Chips */}
					</div>

					{/* Error Handling */}
					{error && <div className="text-red-600">{error}</div>}
					{/* Error Handling End */}

					{/* Kebab Store Cards */}
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
					{/* Kebab Store Cards End */}
				</div>
			</section>

			{/* Filter Drawer Mobile */}
			<Drawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				title="Filter"
			>
				<FilterPanel value={uiFilters} onChange={handleFiltersChange} />
			</Drawer>
			{/* Filter Drawer Mobile End */}
		</>
	)
}
