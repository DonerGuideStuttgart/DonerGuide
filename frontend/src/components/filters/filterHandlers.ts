import type { FilterParams } from '@/types/store'
import { toggleInArray } from './filterUtils'

type ArrayFilterKey = Extract<
	keyof FilterParams,
	| 'district'
	| 'open_hours'
	| 'vegetarian'
	| 'halal'
	| 'waiting_time'
	| 'payment_methods'
>

export function createCheckboxHandler<K extends ArrayFilterKey>(
	key: K,
	filters: FilterParams,
	onChange: (next: FilterParams) => void,
) {
	return (value: string) => {
		const currentArray = (filters[key] ?? []) as string[]
		const nextArray = toggleInArray(currentArray, value)
		onChange({
			...filters,
			[key]: nextArray.length ? nextArray : undefined,
		})
	}
}

export function createRangeSliderHandler(
	filters: FilterParams,
	onChange: (next: FilterParams) => void,
) {
	return (partial: Partial<FilterParams>) => {
		onChange({ ...filters, ...partial })
	}
}

export interface SliderValues {
	scoreMin: number
	scoreMax: number
	priceMin: number
	priceMax: number
	sauceMin: number
	sauceMax: number
	meatMin: number
	meatMax: number
}

export function getSliderValues(
	filters: FilterParams,
	defaults: {
		min_score: number
		max_score: number
		price_min: number
		price_max: number
		sauce_amount_min: number
		sauce_amount_max: number
		meat_ratio_min: number
		meat_ratio_max: number
	},
): SliderValues {
	return {
		scoreMin: filters.min_score ?? defaults.min_score,
		scoreMax: filters.max_score ?? defaults.max_score,
		priceMin: filters.price_min ?? defaults.price_min,
		priceMax: filters.price_max ?? defaults.price_max,
		sauceMin: filters.sauce_amount_min ?? defaults.sauce_amount_min,
		sauceMax: filters.sauce_amount_max ?? defaults.sauce_amount_max,
		meatMin: filters.meat_ratio_min ?? defaults.meat_ratio_min,
		meatMax: filters.meat_ratio_max ?? defaults.meat_ratio_max,
	}
}
