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
	suffix?: string
	onChange: (min: number, max: number) => void
	className?: string
	showInputs?: boolean
}

export function RangeSlider({
	label,
	minValue,
	maxValue,
	currentMin,
	currentMax,
	step = 1,
	formatOptions,
	suffix,
	onChange,
	className,
	showInputs = true,
}: RangeSliderProps) {
	const formatValue = (value: number, includeSuffix = true) => {
		const formatted = formatOptions
			? new Intl.NumberFormat('de-DE', formatOptions).format(value)
			: value.toString()
		return includeSuffix && suffix ? `${formatted}${suffix}` : formatted
	}

	// Validation min
	const handleMinBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		const value = event.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
		const newMin = parseFloat(value)
		if (!isNaN(newMin) && newMin >= minValue && newMin <= currentMax) {
			onChange(Math.round(newMin), currentMax)
		} else {
			event.target.value = currentMin.toString()
		}
	}

	// Validation max
	const handleMaxBlur = (event: React.FocusEvent<HTMLInputElement>) => {
		const value = event.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
		const newMax = parseFloat(value)
		if (!isNaN(newMax) && newMax <= maxValue && newMax >= currentMin) {
			onChange(currentMin, Math.round(newMax))
		} else {
			event.target.value = currentMax.toString()
		}
	}

	return (
		<section className={`flex flex-col gap-4 col-span-2 ${className || ''}`}>
			<span className="text-sm font-medium">{label}</span>
			<ClientOnly
				fallback={
					<div className="h-12 animate-pulse bg-base-200 rounded"></div>
				}
			>
				<Slider
					className="w-full px-2"
					value={[currentMin, currentMax]}
					maxValue={maxValue}
					minValue={minValue}
					step={step}
					aria-label={label}
					onChange={(event) => {
						const [min, max] = event as [number, number]
						onChange(min, max)
					}}
					hideThumb={false}
					hideValue={false}
					classNames={{
						track: '!bg-neutral-content',
						filler: '!bg-primary',
						thumb: '[&>*]:hidden',
					}}
					renderThumb={(props) => {
						const index = props.index as number
						const displayValue = index === 0 ? currentMin : currentMax
						return (
							<div {...props} className="group relative">
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-primary shadow-md rounded-full cursor-grab data-[dragging=true]:cursor-grabbing size-4" />
								<div className="absolute bg-base-100 border border-primary bottom-full left-1/2 -translate-x-1/2 text-xs rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 group-data-[dragging=true]:opacity-100 transition-opacity px-2 py-1 mb-3">
									{formatValue(displayValue)}
								</div>
							</div>
						)
					}}
				/>
			</ClientOnly>
			{showInputs && (
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<input
							type="number"
							inputMode="numeric"
							defaultValue={formatValue(currentMin, false)}
							key={currentMin}
							onBlur={handleMinBlur}
							className={`input input-bordered input-sm rounded-full w-full text-center text-sm focus:outline-none focus:border-2 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-7`}
						/>
						{suffix && (
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-content pointer-events-none z-10">
								{suffix}
							</span>
						)}
					</div>
					<span className="text-neutral-content/50">-</span>
					<div className="relative flex-1">
						<input
							type="number"
							inputMode="numeric"
							defaultValue={formatValue(currentMax, false)}
							key={currentMax}
							onBlur={handleMaxBlur}
							className={`input input-bordered input-sm rounded-full w-full text-center text-sm focus:outline-none focus:border-2 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-7`}
						/>
						{suffix && (
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-content pointer-events-none z-10">
								{suffix}
							</span>
						)}
					</div>
				</div>
			)}
		</section>
	)
}
