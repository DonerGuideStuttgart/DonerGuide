'use client'
import Chevrondown from '@/assets/icons/chevrondown.svg'

type SortOption = {
	value: string
	label: string
}

const SORT_OPTIONS: SortOption[] = [
	{ value: '', label: 'Relevanz' },
	{ value: 'score_desc', label: 'KI Rating (Niedrigster)' },
	{ value: 'score_asc', label: 'KI Rating (Höchster)' },
	{ value: 'price_asc', label: 'Preis (Niedrigster)' },
	{ value: 'price_desc', label: 'Preis (Höchster)' },
]

type SortControlProps = {
	value?: string
	onChange: (value: string) => void
}

export default function SortControl({
	value = '',
	onChange,
}: SortControlProps) {
	const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value)
	const displayLabel = selectedOption?.label ?? SORT_OPTIONS[0].label

	return (
		<div className="flex items-center w-full sm:w-auto gap-3">
			<span className="text-sm text-nowrap">Sortieren nach</span>

			<div className="dropdown dropdown-end w-full sm:w-auto">
				{/* Button */}
				<div
					tabIndex={0}
					role="button"
					className="btn btn-ghost bg-base-100 font-normal border border-primary rounded-full px-4 gap-2 w-full sm:w-auto"
				>
					{displayLabel}
					<Chevrondown className="size-3" />
				</div>
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
									option.value === value ? 'active bg-secondary text-white' : ''
								}
								onClick={() => onChange(option.value)}
							>
								{option.label}
							</button>
						</li>
					))}
				</ul>
				{/* Dropdown End */}
			</div>
		</div>
	)
}
