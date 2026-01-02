'use client'
import { useExplore } from '@/app/(entdecken)/useExplore'
import Chevrondown from '@/assets/icons/chevrondown.svg'
import ClientOnly from './ClientOnly'

type SortOption = {
	value: string
	label: string
}

const SORT_OPTIONS: SortOption[] = [
	{ value: '', label: 'Relevanz' },
	{ value: 'rating_desc', label: 'KI Rating (Höchster)' },
	{ value: 'rating_asc', label: 'KI Rating (Niedrigster)' },
	{ value: 'price_asc', label: 'Preis (Niedrigster)' },
	{ value: 'price_desc', label: 'Preis (Höchster)' },
]

export default function Sort() {
	const { uiSort, handleSortChange } = useExplore()
	const selectedOption = SORT_OPTIONS.find((opt) => opt.value === uiSort)
	const displayLabel = selectedOption?.label ?? SORT_OPTIONS[0].label

	return (
		<ClientOnly>
			<div className="flex items-center w-full sm:w-auto gap-3">
				<span className="text-sm text-nowrap">Sortieren nach</span>

				<div className="dropdown dropdown-end w-full sm:w-auto">
					{/* Button */}
					<button
						tabIndex={0}
						type="button"
						className="btn btn-ghost bg-base-100 font-normal border border-primary rounded-full px-4 gap-2 w-full sm:w-auto"
					>
						{displayLabel}
						<Chevrondown className="size-3" />
					</button>
					{/* Button End */}

					{/* Dropdown */}
					<ul
						tabIndex={0}
						className="dropdown-content menu bg-base-100 border border-primary rounded-box z-10 shadow-lg w-full sm:w-56 p-2 mt-2"
					>
						{SORT_OPTIONS.map((option) => (
							<li key={option.value}>
								<button
									className={
										option.value === uiSort
											? 'active bg-secondary text-white'
											: 'hover:bg-neutral-content/30'
									}
									onClick={() => handleSortChange(option.value)}
								>
									{option.label}
								</button>
							</li>
						))}
					</ul>
					{/* Dropdown End */}
				</div>
			</div>
		</ClientOnly>
	)
}
