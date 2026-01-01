import { Slider } from '@heroui/slider'
import ClientOnly from '../ClientOnly'

type RangeSliderProps = {
	label: string
	minValue: number
	maxValue: number
	currentMin: number
	currentMax: number
	step?: number
	formatOptions?: Intl.NumberFormatOptions
	onChange: (min: number, max: number) => void
	className?: string
}

export function RangeSlider({
	label,
	minValue,
	maxValue,
	currentMin,
	currentMax,
	step = 1,
	formatOptions,
	onChange,
	className,
}: RangeSliderProps) {
	return (
		<label className={`flex flex-col col-span-2 ${className || ''}`}>
			<ClientOnly
				fallback={
					<div className="h-12 animate-pulse bg-base-200 rounded"></div>
				}
			>
				<Slider
					className="max-w-md"
					value={[currentMin, currentMax]}
					label={label}
					maxValue={maxValue}
					minValue={minValue}
					step={step}
					formatOptions={formatOptions}
					onChange={(e) => {
						const [min, max] = e as [number, number]
						onChange(min, max)
					}}
				/>
			</ClientOnly>
		</label>
	)
}
