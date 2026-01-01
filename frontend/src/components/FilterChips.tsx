'use client'

import { useExplore } from '@/app/(entdecken)/useExplore'
import Aistars from '@/assets/icons/aistars.svg'
import Close from '@/assets/icons/close.svg'
import type { FilterParams } from '@/types/store'
import type { ReactNode } from 'react'
import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from '../types/records'
import ClientOnly from './ClientOnly'

type Chip = { label: ReactNode; onRemove: () => void; key: string }

type RangeFilterConfig = {
	type: 'range'
	minKey: keyof FilterParams
	maxKey: keyof FilterParams
	defaultMin: number
	defaultMax: number
	formatLabel: (min: number, max: number) => ReactNode
}

type ArrayFilterConfig<K extends keyof FilterParams> = {
	type: 'array'
	key: K
	labels: Record<string, string>
}

type SingleFilterConfig<K extends keyof FilterParams> = {
	type: 'single'
	key: K
	labels: Record<string, string>
}

type FilterConfig =
	| RangeFilterConfig
	| ArrayFilterConfig<keyof FilterParams>
	| SingleFilterConfig<keyof FilterParams>

const FILTER_CONFIGS: FilterConfig[] = [
	{
		type: 'range',
		minKey: 'min_score',
		maxKey: 'max_score',
		defaultMin: 1,
		defaultMax: 5,
		formatLabel: (min, max) => (
			<span className="flex items-center gap-1">
				{min} - {max}
				<Aistars className="size-4" />
			</span>
		),
	},
	{
		type: 'range',
		minKey: 'price_min',
		maxKey: 'price_max',
		defaultMin: 0,
		defaultMax: 30,
		formatLabel: (min, max) => (
			<>
				{min}€ - {max}€
			</>
		),
	},
	{
		type: 'range',
		minKey: 'sauce_amount_min',
		maxKey: 'sauce_amount_max',
		defaultMin: 0,
		defaultMax: 100,
		formatLabel: (min, max) => `Soße ${min} - ${max}%`,
	},
	{
		type: 'range',
		minKey: 'meat_ratio_min',
		maxKey: 'meat_ratio_max',
		defaultMin: 0,
		defaultMax: 100,
		formatLabel: (min, max) => `Fleisch ${min} - ${max}%`,
	},
	{
		type: 'array',
		key: 'district',
		labels: DISTRICT_LABELS,
	},
	{
		type: 'array',
		key: 'open_hours',
		labels: OPEN_HOURS_LABELS,
	},
	{
		type: 'single',
		key: 'vegetarian',
		labels: VEGETARIAN_LABELS,
	},
	{
		type: 'single',
		key: 'halal',
		labels: HALAL_LABELS,
	},
	{
		type: 'single',
		key: 'waiting_time',
		labels: WAITING_TIME_LABELS,
	},
	{
		type: 'single',
		key: 'payment_methods',
		labels: PAYMENT_LABELS,
	},
]

export default function FilterChips() {
	const { uiFilters: filters, handleRemoveFilter: onRemove } = useExplore()

	const chips = FILTER_CONFIGS.flatMap((config): Chip[] => {
		if (config.type === 'range') {
			const minValue = filters[config.minKey]
			const maxValue = filters[config.maxKey]

			if (minValue !== undefined || maxValue !== undefined) {
				const min = (minValue as number) ?? config.defaultMin
				const max = (maxValue as number) ?? config.defaultMax

				return [
					{
						label: config.formatLabel(min, max),
						onRemove: () => onRemove([config.minKey, config.maxKey]),
						key: `${String(config.minKey)}-${String(config.maxKey)}`,
					},
				]
			}
		} else if (config.type === 'array') {
			const values = filters[config.key] as string[] | undefined

			if (values && values.length > 0) {
				return values.map((value) => ({
					label: config.labels[value] ?? String(value),
					onRemove: () => onRemove(config.key, String(value)),
					key: `${String(config.key)}-${value}`,
				}))
			}
		} else if (config.type === 'single') {
			const value = filters[config.key] as string | undefined

			if (value !== undefined) {
				return [
					{
						label: config.labels[value] ?? String(value),
						onRemove: () => onRemove(config.key),
						key: `${String(config.key)}-${value}`,
					},
				]
			}
		}

		return []
	})

	if (chips.length === 0) return null

	return (
		<ClientOnly>
			<div className="flex flex-wrap gap-2">
				{chips.map((chip) => (
					<button
						onClick={chip.onRemove}
						key={chip.key}
						aria-label="Remove filter"
						className="flex items-center text-sm text-primary bg-base-100 border border-primary rounded-full cursor-pointer py-1 px-3"
					>
						<span className="mr-2">{chip.label}</span>
						<Close className="size-2.5" />
					</button>
				))}
			</div>
		</ClientOnly>
	)
}
