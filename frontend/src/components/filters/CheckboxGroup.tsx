type CheckboxGroupProps<T extends string> = {
	label: string
	items: T[]
	labels: Record<T, string>
	selectedItems: T[]
	onToggle: (item: T) => void
	maxHeight?: string
}

export function CheckboxGroup<T extends string>({
	label,
	items,
	labels,
	selectedItems,
	onToggle,
	maxHeight = '200px',
}: CheckboxGroupProps<T>) {
	return (
		<div className="flex flex-col gap-2 col-span-2">
			<label className="text-sm font-medium">{label}</label>
			<div
				className="overflow-y-auto border rounded-md p-2 bg-base-100"
				style={{ maxHeight }}
			>
				<div className="flex flex-col gap-1">
					{items.map((item) => (
						<label
							key={item}
							className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
						>
							<input
								type="checkbox"
								className="checkbox checkbox-sm"
								checked={selectedItems.includes(item)}
								onChange={() => onToggle(item)}
							/>
							<span className="text-sm">{labels[item]}</span>
						</label>
					))}
				</div>
			</div>
		</div>
	)
}
