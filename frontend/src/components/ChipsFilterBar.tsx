'use client'
import { Filters } from './FilterPanel'
import {
	DISTRICT_LABELS,
	OPEN_HOURS_LABELS,
	WAITING_TIME_LABELS,
	HALAL_LABELS,
	VEGETARIAN_LABELS,
	PAYMENT_LABELS,
} from '../types/records'

interface ChipsFilterBarProps {
	filters: Filters
	onRemove: (key: keyof Filters | (keyof Filters)[], value?: string) => void
}

export default function ChipsFilterBar({
	filters,
	onRemove,
}: ChipsFilterBarProps) {
	const chips: { label: string; onRemove: () => void }[] = []

	if (filters.min_score !== undefined || filters.max_score !== undefined) {
		const min = filters.min_score ?? 0
		const max = filters.max_score ?? 100
		chips.push({
			label: `${min}-${max}⭐`,
			onRemove: () => {
				onRemove(['min_score', 'max_score'])
			},
		})
	}

	if (filters.price_min !== undefined || filters.price_max !== undefined) {
		const min = filters.price_min ?? 0
		const max = filters.price_max ?? 30
		chips.push({
			label: `${min}-${max}€`,
			onRemove: () => {
				onRemove(['price_min', 'price_max'])
			},
		})
	}

	if (filters.district) {
		filters.district.split(',').forEach((district) => {
			chips.push({
				label: DISTRICT_LABELS[district] || district,
				onRemove: () => onRemove('district', district),
			})
		})
	}

	if (filters.open_hours) {
		filters.open_hours.split(',').forEach((hour) => {
			chips.push({
				label: OPEN_HOURS_LABELS[hour] || hour,
				onRemove: () => onRemove('open_hours', hour),
			})
		})
	}

	if (filters.vegetarian) {
		filters.vegetarian.split(',').forEach((veg) => {
			chips.push({
				label: VEGETARIAN_LABELS[veg] || veg,
				onRemove: () => onRemove('vegetarian', veg),
			})
		})
	}

	if (filters.halal) {
		chips.push({
			label: HALAL_LABELS[filters.halal] || filters.halal,
			onRemove: () => onRemove('halal'),
		})
	}

	if (
		filters.sauce_amount_min !== undefined ||
		filters.sauce_amount_max !== undefined
	) {
		const min = filters.sauce_amount_min ?? 0
		const max = filters.sauce_amount_max ?? 100
		chips.push({
			label: `Soße ${min}-${max}`,
			onRemove: () => {
				onRemove(['sauce_amount_min', 'sauce_amount_max'])
			},
		})
	}

	if (
		filters.meat_ratio_min !== undefined ||
		filters.meat_ratio_max !== undefined
	) {
		const min = filters.meat_ratio_min ?? 0
		const max = filters.meat_ratio_max ?? 100
		chips.push({
			label: `Fleisch ${min}-${max}`,
			onRemove: () => {
				onRemove(['meat_ratio_min', 'meat_ratio_max'])
			},
		})
	}

	if (filters.waiting_time) {
		chips.push({
			label: WAITING_TIME_LABELS[filters.waiting_time] || filters.waiting_time,
			onRemove: () => onRemove('waiting_time'),
		})
	}

	if (filters.payment_methods) {
		chips.push({
			label: PAYMENT_LABELS[filters.payment_methods] || filters.payment_methods,
			onRemove: () => onRemove('payment_methods'),
		})
	}

	if (chips.length === 0) return null

	return (
		<div className="flex flex-wrap gap-2 p-4 bg-base-300 rounded-md">
			{chips.map((chip, index) => (
				<div
					key={index}
					className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-content rounded-full text-sm"
				>
					<span>{chip.label}</span>
					<button
						onClick={chip.onRemove}
						className="hover:bg-accent-content rounded-full w-4 h-4 flex items-center justify-center"
						aria-label="Remove filter"
					>
						×
					</button>
				</div>
			))}
		</div>
	)
}
