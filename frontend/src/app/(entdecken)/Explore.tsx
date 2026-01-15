'use client'
import Filter from '@/assets/icons/filter.svg'
import ClientOnly from '@/components/ClientOnly'
import DonerCard, { DonerCardSkeleton } from '@/components/DonerCard'
import Drawer from '@/components/Drawer'
import FilterChips from '@/components/FilterChips'
import FilterPanel from '@/components/FilterPanel'
import StoreMap from '@/components/Map/StoreMap'
import Sort from '@/components/Sort'
import { useState } from 'react'
import { INITIAL_LIMIT, LOAD_MORE_COUNT } from './searchParams'
import { useExplore } from './useExplore'

export default function Explore() {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

	const {
		stores,
		error,
		loading,
		hasMore,
		handleLoadMore,
		handleResetAllFilters,
	} = useExplore()

	const title =
		stores.length === 0
			? 'Entdecke die besten Döner in Stuttgart'
			: stores.length === 1
				? 'Entdecke den besten Döner in Stuttgart'
				: `Entdecke die ${stores.length} besten Döner in Stuttgart`

	return (
		<>
			{/* Header with Title */}
			<header className="flex items-center justify-between mb-2 lg:mb-0">
				<h1 className="text-2xl font-bold">{title}</h1>
			</header>

			{/* View Mode Toggle Mobile */}
			<section className="lg:hidden flex gap-2 mb-3">
				<button
					onClick={() => setViewMode('list')}
					className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
						viewMode === 'list'
							? 'bg-primary text-white shadow-[0_3px_0px_#000000]'
							: 'bg-base-200 text-neutral'
					}`}
				>
					Liste
				</button>
				<button
					onClick={() => setViewMode('map')}
					className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
						viewMode === 'map'
							? 'bg-primary text-white shadow-[0_3px_0px_#000000]'
							: 'bg-base-200 text-neutral'
					}`}
				>
					Karte
				</button>
			</section>
			{/* View Mode Toggle Mobile End */}

			{/* Filter Mobile Button and Chips */}
			<div className="lg:hidden flex items-center flex-wrap gap-2 mb-3">
				<button
					onClick={() => setIsDrawerOpen(true)}
					className="flex items-center cursor-pointer bg-primary text-white rounded-full shadow-[0_3px_0px_#000000] active:shadow-none active:translate-y-0.5 py-2 px-4"
					aria-label="Open filters"
				>
					<Filter className="size-5 fill-base-300" />
				</button>

				<FilterChips />
			</div>
			{/* Filter Mobile Button and Chips End */}

			<section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				{/* Filter Desktop */}
				<section className="hidden lg:block lg:col-span-1">
					<section className="flex justify-between text-sm mb-1">
						<p>{stores.length} Döner</p>

						<button className="link link-hover" onClick={handleResetAllFilters}>
							Filter zurücksetzen
						</button>
					</section>

					<FilterPanel />
				</section>
				{/* Filter Desktop End */}

				{/* Mobile Map View */}
				{viewMode === 'map' && (
					<section className="lg:hidden col-span-1 mb-4">
						<ClientOnly
							fallback={
								<div className="h-[400px] bg-base-200 rounded-xl animate-pulse" />
							}
						>
							<StoreMap stores={stores} />
						</ClientOnly>
					</section>
				)}
				{/* Mobile Map View End */}

				<section
					className={`lg:col-span-3 space-y-4 ${viewMode === 'map' ? 'hidden lg:block' : ''}`}
				>
					{/* Map Section - Desktop Only */}
					<div className="hidden lg:block mt-6">
						<ClientOnly
							fallback={
								<div className="h-[400px] bg-base-200 rounded-xl animate-pulse" />
							}
						>
							<StoreMap stores={stores} />
						</ClientOnly>
					</div>
					{/* Map Section End */}

					{/* Sort */}
					<section className="flex justify-end mb-2 lg:mb-4">
						<Sort />
					</section>

					{/* Error Handling */}
					{error && (
						<div className="alert alert-error alert-outline">
							<div>
								<h3 className="font-bold">Fehler beim Laden der Daten</h3>
								<div className="text-sm">{error}</div>
							</div>
						</div>
					)}
					{/* Error Handling End */}

					{/* Kebab Store Cards */}
					{/* Initial loading */}
					{loading && stores.length === 0 && (
						<>
							{Array.from({ length: INITIAL_LIMIT }).map((_, index) => (
								<DonerCardSkeleton key={index} />
							))}
						</>
					)}

					{/* Empty State */}
					{!loading && stores.length === 0 && !error && (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<h3 className="text-xl font-medium mb-2">Keine Döner gefunden</h3>
							<p className="text-neutral">
								Versuche es mit anderen Filtern oder setze die Filter zurück.
							</p>
						</div>
					)}

					{/* Store Cards */}
					<section className="space-y-3 mt-3 lg:mt-0">
						{stores.map((store) => (
							<DonerCard key={store.slug} store={store} />
						))}
					</section>

					{/* Load More Skeletons */}
					{loading &&
						stores.length > 0 &&
						Array.from({ length: LOAD_MORE_COUNT }).map((_, index) => (
							<DonerCardSkeleton key={`loading-${index}`} />
						))}

					{/* Load more button */}
					{hasMore && stores.length > 0 && (
						<div className="flex justify-center mt-4">
							<button
								onClick={handleLoadMore}
								disabled={loading}
								className="link link-outline btn-primary"
							>
								Mehr laden
							</button>
						</div>
					)}
					{/* Kebab Store Cards End */}
				</section>
			</section>

			{/* Filter Drawer Mobile */}
			<Drawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				title="Filter"
			>
				<FilterPanel isMobile />

				<section className="flex items-center justify-between px-5 pb-4">
					<button
						className="link link-hover text-sm"
						onClick={handleResetAllFilters}
					>
						Filter zurücksetzen
					</button>

					<button
						onClick={() => setIsDrawerOpen(false)}
						className="flex items-center cursor-pointer bg-secondary text-white text-sm rounded-full shadow-[0_3px_0px_#b54615] active:shadow-none active:translate-y-0.5 py-1.5 px-4"
						aria-label="Open filters"
					>
						{stores.length} Döner anzeigen
					</button>
				</section>
			</Drawer>
			{/* Filter Drawer Mobile End */}
		</>
	)
}
