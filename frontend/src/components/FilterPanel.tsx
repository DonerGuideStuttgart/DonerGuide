'use client'
import { useExplore } from '@/app/(entdecken)/useExplore'
import type { District, Halal, PaymentMethod, WaitingTime } from '@/types/store'
import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	PAYMENT_LABELS,
	WAITING_TIME_LABELS,
} from '../types/records'
import { CheckboxGroup } from './filters/CheckboxGroup'
import {
	createCheckboxHandler,
	createRangeSliderHandler,
	getSliderValues,
} from './filters/filterHandlers'
import { UI_DEFAULTS } from './filters/filterUtils'
import { RangeSlider } from './filters/RangeSlider'

type Props = {
	isMobile?: boolean
}

export default function FilterPanel({ isMobile }: Props) {
	const { uiFilters, handleFiltersChange } = useExplore()
	const toggleDistrict = createCheckboxHandler(
		'district',
		uiFilters,
		handleFiltersChange,
	)
	const toggleOpenHour = createCheckboxHandler(
		'open_hours',
		uiFilters,
		handleFiltersChange,
	)
	const toggleVegetarian = createCheckboxHandler(
		'vegetarian',
		uiFilters,
		handleFiltersChange,
	)
	const toggleHalal = createCheckboxHandler(
		'halal',
		uiFilters,
		handleFiltersChange,
	)
	const toggleWaitingTime = createCheckboxHandler(
		'waiting_time',
		uiFilters,
		handleFiltersChange,
	)
	const togglePaymentMethod = createCheckboxHandler(
		'payment_methods',
		uiFilters,
		handleFiltersChange,
	)
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
		<section
			className={`bg-base-100 ${isMobile ? '' : 'border rounded-md'} px-5 py-6`}
		>
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
					suffix="€"
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
					searchPlaceholder="Suche nach einem Bezirk..."
				/>

				{/* Halal */}
				<CheckboxGroup
					label="Halal"
					items={Object.keys(HALAL_LABELS) as Halal[]}
					labels={HALAL_LABELS}
					selectedItems={uiFilters.halal ?? []}
					onToggle={toggleHalal}
				/>

				{/* Soßenmenge */}
				<RangeSlider
					label="Soßenmenge"
					minValue={0}
					maxValue={100}
					currentMin={sauceMin}
					currentMax={sauceMax}
					step={1}
					suffix="%"
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
					suffix="%"
					onChange={(min, max) =>
						handleRangeChange({ meat_ratio_min: min, meat_ratio_max: max })
					}
				/>

				{/* Wartezeit */}
				<CheckboxGroup
					label="Wartezeit"
					items={Object.keys(WAITING_TIME_LABELS) as WaitingTime[]}
					labels={WAITING_TIME_LABELS}
					selectedItems={uiFilters.waiting_time ?? []}
					onToggle={toggleWaitingTime}
				/>

				{/* Bezahlung */}
				<CheckboxGroup
					label="Bezahlung"
					items={Object.keys(PAYMENT_LABELS) as PaymentMethod[]}
					labels={PAYMENT_LABELS}
					selectedItems={uiFilters.payment_methods ?? []}
					onToggle={togglePaymentMethod}
				/>
			</div>
		</section>
	)
}
