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
	onChange,
	className,
	showInputs = true,
}: RangeSliderProps) {
	const formatValue = (value: number) => {
		return formatOptions
			? new Intl.NumberFormat('de-DE', formatOptions).format(value)
			: value.toString()
	}

	const handleMinBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
		const newMin = parseFloat(value)
		if (!isNaN(newMin) && newMin >= minValue && newMin <= currentMax) {
			onChange(Math.round(newMin), currentMax)
		}
	}

	const handleMaxBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
		const newMax = parseFloat(value)
		if (!isNaN(newMax) && newMax <= maxValue && newMax >= currentMin) {
			onChange(currentMin, Math.round(newMax))
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
					onChange={(e) => {
						const [min, max] = e as [number, number]
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
								<div
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-primary shadow-md rounded-full cursor-grab data-[dragging=true]:cursor-grabbing size-4"
									style={{
										backgroundColor: 'white',
										borderColor: 'hsl(var(--p))',
										borderWidth: '1px',
										borderStyle: 'solid',
									}}
								/>
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
					<input
						type="text"
						defaultValue={formatValue(currentMin)}
						key={currentMin}
						onBlur={handleMinBlur}
						className="input input-bordered input-sm rounded-full flex-1 text-center text-sm focus:outline-none focus:border-2 focus:border-primary"
					/>
					<span className="text-neutral-content/50">-</span>
					<input
						type="text"
						defaultValue={formatValue(currentMax)}
						key={currentMax}
						onBlur={handleMaxBlur}
						className="input input-bordered input-sm rounded-full flex-1 text-center text-sm focus:outline-none focus:border-2 focus:border-primary"
					/>
				</div>
			)}
		</section>
	)
}
