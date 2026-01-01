import type { District, FilterParams, OpenHours } from '@/types/store'
import { toggleInArray } from './filterUtils'

export function createToggleDistrict(
	filters: FilterParams,
	onChange: (next: FilterParams) => void,
) {
	return (d: District) => {
		const districts = filters.district ?? []
		const next = toggleInArray(districts, d)
		onChange({ ...filters, district: next.length ? next : undefined })
	}
}

export function createToggleOpenHour(
	filters: FilterParams,
	onChange: (next: FilterParams) => void,
) {
	return (h: OpenHours) => {
		const openHours = filters.open_hours ?? []
		const next = toggleInArray(openHours, h)
		onChange({ ...filters, open_hours: next.length ? next : undefined })
	}
}

export function createToggleRadio(
	filters: FilterParams,
	onChange: (next: FilterParams) => void,
) {
	return <
		K extends 'vegetarian' | 'halal' | 'waiting_time' | 'payment_methods',
	>(
		key: K,
		value: NonNullable<FilterParams[K]>,
	) => {
		const current = filters[key]
		onChange({
			...filters,
			[key]: current === value ? undefined : value,
		} as FilterParams)
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
