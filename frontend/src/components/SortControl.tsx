'use client'
export default function SortControl({
	value,
	onChange,
}: {
	value?: string
	onChange: (v: string) => void
}) {
	return (
		<div className="flex items-center gap-2">
			<label className="text-sm">Sort</label>
			<select
				className="select select-sm"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			>
				<option value="">Relevance</option>
				<option value="rating_desc">Rating ↓</option>
				<option value="rating_asc">Rating ↑</option>
				<option value="price_asc">Price ↑</option>
				<option value="price_desc">Price ↓</option>
			</select>
		</div>
	)
}
