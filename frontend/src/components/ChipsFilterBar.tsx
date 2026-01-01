'use client'

import type { FilterParams } from '@/types/store'
import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from '../types/records'
import ClientOnly from './ClientOnly'

type ChipsFilterBarProps = {
	filters: FilterParams
	onRemove: (
		key: keyof FilterParams | (keyof FilterParams)[],
		value?: string,
	) => void
}

export default function ChipsFilterBar({
	filters,
	onRemove,
}: ChipsFilterBarProps) {
	const chips: Array<{ label: string; onRemove: () => void }> = []

	// Score range
	if (filters.min_score !== undefined || filters.max_score !== undefined) {
		const minScore = filters.min_score ?? 0
		const maxScore = filters.max_score ?? 100

		chips.push({
			label: `${minScore}-${maxScore}⭐`,
			onRemove: () => onRemove(['min_score', 'max_score']),
		})
	}

	// Price range
	if (filters.price_min !== undefined || filters.price_max !== undefined) {
		const minPrice = filters.price_min ?? 0
		const maxPrice = filters.price_max ?? 30

		chips.push({
			label: `${minPrice}-${maxPrice}€`,
			onRemove: () => onRemove(['price_min', 'price_max']),
		})
	}

	// District chips (array)
	if (filters.district && filters.district.length > 0) {
		for (const district of filters.district) {
			chips.push({
				label: DISTRICT_LABELS[district] ?? String(district),
				onRemove: () => onRemove('district', String(district)),
			})
		}
	}

	// Open hours chips (array)
	if (filters.open_hours && filters.open_hours.length > 0) {
		for (const hour of filters.open_hours) {
			chips.push({
				label: OPEN_HOURS_LABELS[hour] ?? String(hour),
				onRemove: () => onRemove('open_hours', String(hour)),
			})
		}
	}

	// Vegetarian (single)
	if (filters.vegetarian !== undefined) {
		const vegetarian = filters.vegetarian
		chips.push({
			label: VEGETARIAN_LABELS[vegetarian] ?? String(vegetarian),
			onRemove: () => onRemove('vegetarian'),
		})
	}

	// Halal (single)
	if (filters.halal !== undefined) {
		const halal = filters.halal
		chips.push({
			label: HALAL_LABELS[halal] ?? String(halal),
			onRemove: () => onRemove('halal'),
		})
	}

	// Sauce range
	if (
		filters.sauce_amount_min !== undefined ||
		filters.sauce_amount_max !== undefined
	) {
		const minSauce = filters.sauce_amount_min ?? 0
		const maxSauce = filters.sauce_amount_max ?? 100

		chips.push({
			label: `Soße ${minSauce}-${maxSauce}`,
			onRemove: () => onRemove(['sauce_amount_min', 'sauce_amount_max']),
		})
	}

	// Meat ratio range
	if (
		filters.meat_ratio_min !== undefined ||
		filters.meat_ratio_max !== undefined
	) {
		const minMeat = filters.meat_ratio_min ?? 0
		const maxMeat = filters.meat_ratio_max ?? 100

		chips.push({
			label: `Fleisch ${minMeat}-${maxMeat}`,
			onRemove: () => onRemove(['meat_ratio_min', 'meat_ratio_max']),
		})
	}

	// Waiting time (single)
	if (filters.waiting_time !== undefined) {
		const waitingTime = filters.waiting_time
		chips.push({
			label: WAITING_TIME_LABELS[waitingTime] ?? String(waitingTime),
			onRemove: () => onRemove('waiting_time'),
		})
	}

	// Payment method (single)
	if (filters.payment_methods !== undefined) {
		const paymentMethod = filters.payment_methods
		chips.push({
			label: PAYMENT_LABELS[paymentMethod] ?? String(paymentMethod),
			onRemove: () => onRemove('payment_methods'),
		})
	}

	if (chips.length === 0) return null

	return (
		<ClientOnly>
			<div className="flex flex-wrap gap-2 p-4 bg-base-300 rounded-md">
				{chips.map((chip) => (
					<div
						key={chip.label}
						className="flex items-center gap-1 px-3 py-1 bg-secondary text-base-300 rounded-full text-sm"
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
		</ClientOnly>
	)
}
