import { badgeConfig } from './badgeConfig'
import { BadgeType } from '@/types/BadgeType'

interface Props {
	type: BadgeType
	value?: string | number // optional für AI Rating, etc.
	size?: 'sm' | 'md' | 'lg'
}

export default function Badge({ type, value, size = 'sm' }: Props) {
	const config = badgeConfig[type]
	if (!config) return null

	return (
		<div
			className={`badge badge-outline ${config.className} badge-${size} gap-1`}
		>
			{/* {config.icon} */}
			{/* {value ? `${value}` : config.text} */}
			{/* {config.tooltip} */}
		</div>
	)
}
