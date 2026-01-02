import type { FilterParams } from '@/types/store'

export const toggleInArray = <T>(arr: T[], item: T): T[] =>
	arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]

export const UI_DEFAULTS = {
	min_score: 0,
	max_score: 100,

	price_min: 0,
	price_max: 30,

	sauce_amount_min: 0,
	sauce_amount_max: 100,

	meat_ratio_min: 0,
	meat_ratio_max: 100,
}

export function resetKey(
	k: keyof FilterParams,
	current: FilterParams,
): FilterParams {
	// Arrays
	if (k === 'district') return { ...current, district: undefined }
	if (k === 'open_hours') return { ...current, open_hours: undefined }
	if (k === 'vegetarian') return { ...current, vegetarian: undefined }
	if (k === 'halal') return { ...current, halal: undefined }
	if (k === 'waiting_time') return { ...current, waiting_time: undefined }
	if (k === 'payment_methods') return { ...current, payment_methods: undefined }

	// Slider & numbers
	if (
		k === 'min_score' ||
		k === 'max_score' ||
		k === 'price_min' ||
		k === 'price_max' ||
		k === 'sauce_amount_min' ||
		k === 'sauce_amount_max' ||
		k === 'meat_ratio_min' ||
		k === 'meat_ratio_max'
	) {
		return { ...current, [k]: undefined } as FilterParams
	}

	return { ...current, [k]: undefined } as FilterParams
}

export function removeFilterValue(
	filters: FilterParams,
	key: keyof FilterParams | (keyof FilterParams)[],
	valueToRemove?: string,
): FilterParams {
	if (Array.isArray(key)) {
		let next = { ...filters }
		for (const k of key) next = resetKey(k, next)
		return next
	}

	if (
		valueToRemove &&
		(key === 'district' ||
			key === 'open_hours' ||
			key === 'vegetarian' ||
			key === 'halal' ||
			key === 'waiting_time' ||
			key === 'payment_methods')
	) {
		const currentArr = (filters[key] ?? []) as string[]
		const nextArr = currentArr.filter((v) => String(v) !== valueToRemove)

		return {
			...filters,
			[key]: nextArr.length ? nextArr : undefined,
		} as FilterParams
	}

	return resetKey(key, filters)
}
