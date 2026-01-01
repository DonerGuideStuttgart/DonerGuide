'use client'

import { useExplore } from '@/app/(entdecken)/useExplore'
import type {
	District,
	FilterParams,
	Halal,
	OpenHours,
	PaymentMethod,
	Vegetarian,
	WaitingTime,
} from '@/types/store'
import { forwardRef, useImperativeHandle } from 'react'
import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from '../types/records'
import { CheckboxGroup, RangeSlider, SingleCheckboxGroup } from './filters'
import {
	createRangeSliderHandler,
	createToggleDistrict,
	createToggleOpenHour,
	createToggleRadio,
	getSliderValues,
} from './filters/filterHandlers'
import { UI_DEFAULTS } from './filters/filterUtils'

export interface FilterPanelHandle {
	removeFilter: (
		key: keyof FilterParams | (keyof FilterParams)[],
		value?: string,
	) => void
}

const FilterPanel = forwardRef<FilterPanelHandle, Record<string, never>>(
	function FilterPanel(_props, ref) {
		const { uiFilters, handleFiltersChange, handleRemoveFilter } = useExplore()

		useImperativeHandle(ref, () => ({
			removeFilter: handleRemoveFilter,
		}))

		// Create handlers
		const toggleDistrict = createToggleDistrict(uiFilters, handleFiltersChange)
		const toggleOpenHour = createToggleOpenHour(uiFilters, handleFiltersChange)
		const toggleRadio = createToggleRadio(uiFilters, handleFiltersChange)
		const handleRangeChange = createRangeSliderHandler(
			uiFilters,
			handleFiltersChange,
		)

		// Get slider values with defaults
		const {
			scoreMin,
			scoreMax,
			priceMin,
			priceMax,
			sauceMin,
			sauceMax,
			meatMin,
			meatMax,
		} = getSliderValues(uiFilters, UI_DEFAULTS)

		return (
			<section className="bg-base-100 border rounded-md px-5 py-6">
				<div className="grid gap-6">
					{/* Bewertung */}
					<RangeSlider
						label="Bewertung"
						minValue={0}
						maxValue={100}
						currentMin={scoreMin}
						currentMax={scoreMax}
						step={1}
						onChange={(min, max) =>
							handleRangeChange({ min_score: min, max_score: max })
						}
					/>

					{/* Preis */}
					<RangeSlider
						label="Preis"
						minValue={0}
						maxValue={30}
						currentMin={priceMin}
						currentMax={priceMax}
						step={1}
						formatOptions={{ style: 'currency', currency: 'EUR' }}
						onChange={(min, max) =>
							handleRangeChange({ price_min: min, price_max: max })
						}
					/>

					{/* Bezirk */}
					<CheckboxGroup
						label="Bezirk"
						items={Object.keys(DISTRICT_LABELS) as District[]}
						labels={DISTRICT_LABELS}
						selectedItems={uiFilters.district ?? []}
						onToggle={toggleDistrict}
						maxHeight="220px"
						showSearch
					/>

					{/* Öffnungszeiten */}
					<CheckboxGroup
						label="Öffnungszeiten"
						items={Object.keys(OPEN_HOURS_LABELS) as OpenHours[]}
						labels={OPEN_HOURS_LABELS}
						selectedItems={uiFilters.open_hours ?? []}
						onToggle={toggleOpenHour}
					/>

					{/* Vegetarisch/Vegan (abwählbar) */}
					<SingleCheckboxGroup
						label="Vegetarisch/Vegan"
						items={Object.keys(VEGETARIAN_LABELS) as Vegetarian[]}
						labels={VEGETARIAN_LABELS}
						selectedItem={uiFilters.vegetarian}
						onToggle={(v) => toggleRadio('vegetarian', v)}
					/>

					{/* Halal (abwählbar) */}
					<SingleCheckboxGroup
						label="Halal"
						items={Object.keys(HALAL_LABELS) as Halal[]}
						labels={HALAL_LABELS}
						selectedItem={uiFilters.halal}
						onToggle={(h) => toggleRadio('halal', h)}
					/>

					{/* Soßenmenge */}
					<RangeSlider
						label="Soßenmenge"
						minValue={0}
						maxValue={100}
						currentMin={sauceMin}
						currentMax={sauceMax}
						step={1}
						onChange={(min, max) =>
							handleRangeChange({
								sauce_amount_min: min,
								sauce_amount_max: max,
							})
						}
					/>

					{/* Fleischanteil */}
					<RangeSlider
						label="Fleischanteil"
						minValue={0}
						maxValue={100}
						currentMin={meatMin}
						currentMax={meatMax}
						step={1}
						onChange={(min, max) =>
							handleRangeChange({ meat_ratio_min: min, meat_ratio_max: max })
						}
					/>

					{/* Wartezeit (abwählbar) */}
					<SingleCheckboxGroup
						label="Wartezeit"
						items={Object.keys(WAITING_TIME_LABELS) as WaitingTime[]}
						labels={WAITING_TIME_LABELS}
						selectedItem={uiFilters.waiting_time}
						onToggle={(w) => toggleRadio('waiting_time', w)}
					/>

					{/* Bezahlung (abwählbar) */}
					<SingleCheckboxGroup
						label="Bezahlung"
						items={Object.keys(PAYMENT_LABELS) as PaymentMethod[]}
						labels={PAYMENT_LABELS}
						selectedItem={uiFilters.payment_methods}
						onToggle={(p) => toggleRadio('payment_methods', p)}
					/>
				</div>
			</section>
		)
	},
)

export default FilterPanel
