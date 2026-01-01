'use client'

import { Slider } from '@heroui/slider'
import { forwardRef, useImperativeHandle } from 'react'

import type {
	District,
	FilterParams,
	Halal,
	OpenHours,
	PaymentMethod,
	Vegetarian,
	WaitingTime,
} from '@/types/store'

import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from '../types/records'
import ClientOnly from './ClientOnly'

export interface FilterPanelHandle {
	removeFilter: (
		key: keyof FilterParams | (keyof FilterParams)[],
		value?: string,
	) => void
}

type Props = {
	value: FilterParams
	onChange: (next: FilterParams) => void
}

const toggleInArray = <T,>(arr: T[], item: T) =>
	arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]

const UI_DEFAULTS = {
	min_score: 0,
	max_score: 100,

	price_min: 0,
	price_max: 30,

	sauce_amount_min: 0,
	sauce_amount_max: 100,

	meat_ratio_min: 0,
	meat_ratio_max: 100,
}

const FilterPanel = forwardRef<FilterPanelHandle, Props>(function FilterPanel(
	{ value: filters, onChange },
	ref,
) {
	const districts = filters.district ?? []
	const openHours = filters.open_hours ?? []

	const update = (partial: Partial<FilterParams>) =>
		onChange({ ...filters, ...partial })

	function resetKey(
		k: keyof FilterParams,
		current: FilterParams,
	): FilterParams {
		// Arrays
		if (k === 'district') return { ...current, district: undefined }
		if (k === 'open_hours') return { ...current, open_hours: undefined }

		// Radios / single selects -> "nicht gesetzt"
		if (k === 'vegetarian') return { ...current, vegetarian: undefined }
		if (k === 'halal') return { ...current, halal: undefined }
		if (k === 'waiting_time') return { ...current, waiting_time: undefined }
		if (k === 'payment_methods')
			return { ...current, payment_methods: undefined }

		// Slider & numbers -> "nicht gesetzt"
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

		// limit/offset etc. (falls du es je brauchst)
		return { ...current, [k]: undefined } as FilterParams
	}

	function removeFilter(
		key: keyof FilterParams | (keyof FilterParams)[],
		valueToRemove?: string,
	) {
		if (Array.isArray(key)) {
			let next = { ...filters }
			for (const k of key) next = resetKey(k, next)
			onChange(next)
			return
		}

		// remove one element from array fields
		if (valueToRemove && (key === 'district' || key === 'open_hours')) {
			const currentArr = (filters[key] ?? []) as string[]
			const nextArr = currentArr.filter((v) => String(v) !== valueToRemove)

			// wenn leer -> undefined (damit buildStoreQuery es nicht sendet)
			update({
				[key]: nextArr.length ? nextArr : undefined,
			} as Partial<FilterParams>)
			return
		}

		onChange(resetKey(key, filters))
	}

	useImperativeHandle(ref, () => ({ removeFilter }))

	// ---- Toggle helpers (arrays) ----
	const toggleDistrict = (d: District) => {
		const next = toggleInArray(districts, d)
		update({ district: next.length ? next : undefined })
	}

	const toggleOpenHour = (h: OpenHours) => {
		const next = toggleInArray(openHours, h)
		update({ open_hours: next.length ? next : undefined })
	}

	// ---- Toggle helpers (radios -> abwählbar) ----
	const toggleRadio = <
		K extends 'vegetarian' | 'halal' | 'waiting_time' | 'payment_methods',
	>(
		key: K,
		value: NonNullable<FilterParams[K]>,
	) => {
		const current = filters[key]
		update({
			[key]: current === value ? undefined : value,
		} as Partial<FilterParams>)
	}

	// ---- Slider display values (fallback nur für UI) ----
	const scoreMin = filters.min_score ?? UI_DEFAULTS.min_score
	const scoreMax = filters.max_score ?? UI_DEFAULTS.max_score

	const priceMin = filters.price_min ?? UI_DEFAULTS.price_min
	const priceMax = filters.price_max ?? UI_DEFAULTS.price_max

	const sauceMin = filters.sauce_amount_min ?? UI_DEFAULTS.sauce_amount_min
	const sauceMax = filters.sauce_amount_max ?? UI_DEFAULTS.sauce_amount_max

	const meatMin = filters.meat_ratio_min ?? UI_DEFAULTS.meat_ratio_min
	const meatMax = filters.meat_ratio_max ?? UI_DEFAULTS.meat_ratio_max

	return (
		<section className="p-4 border rounded-md">
			<div className="grid gap-6">
				{/* Bewertung */}
				<label className="flex flex-col col-span-2">
					<ClientOnly
						fallback={
							<div className="h-12 animate-pulse bg-base-200 rounded"></div>
						}
					>
						<Slider
							className="max-w-md"
							value={[scoreMin, scoreMax]}
							label="Bewertung"
							maxValue={100}
							minValue={0}
							step={1}
							onChange={(e) => {
								const [min, max] = e as [number, number]
								update({ min_score: min, max_score: max })
							}}
						/>
					</ClientOnly>
				</label>

				{/* Preis */}
				<label className="flex flex-col col-span-2">
					<ClientOnly
						fallback={
							<div className="h-12 animate-pulse bg-base-200 rounded"></div>
						}
					>
						<Slider
							className="max-w-md"
							value={[priceMin, priceMax]}
							formatOptions={{ style: 'currency', currency: 'EUR' }}
							label="Preis"
							maxValue={30}
							minValue={0}
							step={1}
							onChange={(e) => {
								const [min, max] = e as [number, number]
								update({ price_min: min, price_max: max })
							}}
						/>
					</ClientOnly>
				</label>

				{/* Bezirk */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Bezirk</label>
					<div className="h-[200px] overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(DISTRICT_LABELS) as District[]).map((district) => (
								<label
									key={district}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="checkbox"
										className="checkbox checkbox-sm"
										checked={districts.includes(district)}
										onChange={() => toggleDistrict(district)}
									/>
									<span className="text-sm">{DISTRICT_LABELS[district]}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Öffnungszeiten */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Öffnungszeiten</label>
					<div className="overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(OPEN_HOURS_LABELS) as OpenHours[]).map((hour) => (
								<label
									key={hour}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="checkbox"
										className="checkbox checkbox-sm"
										checked={openHours.includes(hour)}
										onChange={() => toggleOpenHour(hour)}
									/>
									<span className="text-sm">{OPEN_HOURS_LABELS[hour]}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Vegetarisch/Vegan (abwählbar) */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Vegetarisch/Vegan</label>
					<div className="overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(VEGETARIAN_LABELS) as Vegetarian[]).map((v) => (
								<label
									key={v}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="checkbox"
										name="vegetarian"
										className="checkbox checkbox-sm"
										checked={filters.vegetarian === v}
										onClick={() => toggleRadio('vegetarian', v)}
										onChange={() => {}}
									/>
									<span className="text-sm">{VEGETARIAN_LABELS[v]}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Halal (abwählbar) */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Halal</label>
					<div className="overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(HALAL_LABELS) as Halal[]).map((h) => (
								<label
									key={h}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="radio"
										name="halal"
										className="radio radio-sm"
										checked={filters.halal === h}
										onClick={() => toggleRadio('halal', h)}
										onChange={() => {}}
									/>
									<span className="text-sm">{HALAL_LABELS[h]}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Soßenmenge */}
				<label className="flex flex-col col-span-2">
					<ClientOnly
						fallback={
							<div className="h-12 animate-pulse bg-base-200 rounded"></div>
						}
					>
						<Slider
							className="max-w-md"
							value={[sauceMin, sauceMax]}
							label="Soßenmenge"
							maxValue={100}
							minValue={0}
							step={1}
							onChange={(e) => {
								const [min, max] = e as [number, number]
								update({ sauce_amount_min: min, sauce_amount_max: max })
							}}
						/>
					</ClientOnly>
				</label>

				{/* Fleischanteil */}
				<label className="flex flex-col col-span-2">
					<ClientOnly
						fallback={
							<div className="h-12 animate-pulse bg-base-200 rounded"></div>
						}
					>
						<Slider
							className="max-w-md"
							value={[meatMin, meatMax]}
							label="Fleischanteil"
							maxValue={100}
							minValue={0}
							step={1}
							onChange={(e) => {
								const [min, max] = e as [number, number]
								update({ meat_ratio_min: min, meat_ratio_max: max })
							}}
						/>
					</ClientOnly>
				</label>

				{/* Wartezeit (abwählbar) */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Wartezeit</label>
					<div className="overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(WAITING_TIME_LABELS) as WaitingTime[]).map((w) => (
								<label
									key={w}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="radio"
										name="waiting_time"
										className="radio radio-sm"
										checked={filters.waiting_time === w}
										onClick={() => toggleRadio('waiting_time', w)}
										onChange={() => {}}
									/>
									<span className="text-sm">{WAITING_TIME_LABELS[w]}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Bezahlung (abwählbar) */}
				<div className="flex flex-col gap-2 col-span-2">
					<label className="text-sm font-medium">Bezahlung</label>
					<div className="overflow-y-auto border rounded-md p-2 bg-base-100">
						<div className="flex flex-col gap-1">
							{(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((p) => (
								<label
									key={p}
									className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
								>
									<input
										type="radio"
										name="payment_methods"
										className="radio radio-sm"
										checked={filters.payment_methods === p}
										onClick={() => toggleRadio('payment_methods', p)}
										onChange={() => {}}
									/>
									<span className="text-sm">{PAYMENT_LABELS[p]}</span>
								</label>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
})

export default FilterPanel
