import Search from '@/assets/icons/search.svg'
import { useState } from 'react'

type CheckboxGroupProps<T extends string> = {
	label: string
	items: T[]
	labels: Record<T, string>
	selectedItems: T[]
	onToggle: (item: T) => void
	maxHeight?: string
	showSearch?: boolean
	searchPlaceholder?: string
}

export function CheckboxGroup<T extends string>({
	label,
	items,
	labels,
	selectedItems,
	onToggle,
	maxHeight = '200px',
	showSearch = false,
	searchPlaceholder = 'Suchen...',
}: CheckboxGroupProps<T>) {
	const [searchTerm, setSearchTerm] = useState('')

	const filteredItems = showSearch
		? items.filter((item) =>
				labels[item].toLowerCase().includes(searchTerm.toLowerCase()),
			)
		: items

	return (
		<section className="flex flex-col col-span-2">
			<label className="text-sm font-medium mb-2">{label}</label>
			{showSearch && (
				<label className="input input-sm input-bordered flex items-center gap-2 mb-2 focus-within:outline-none focus-within:border-2 focus-within:border-primary">
					<Search className="h-4 w-4 opacity-50" />
					<input
						type="search"
						placeholder={searchPlaceholder}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="grow focus:outline-none"
					/>
				</label>
			)}
			<div className="overflow-y-auto" style={{ maxHeight }}>
				<div className="flex flex-col gap-1">
					{filteredItems.map((item) => (
						<label
							key={item}
							className="flex items-center gap-2 p-1 hover:bg-neutral-content/30 cursor-pointer rounded-lg"
						>
							<input
								type="checkbox"
								className="checkbox checkbox-xs"
								checked={selectedItems.includes(item)}
								onChange={() => onToggle(item)}
							/>
							<span className="text-sm">{labels[item]}</span>
						</label>
					))}
				</div>
			</div>
		</section>
	)
}
