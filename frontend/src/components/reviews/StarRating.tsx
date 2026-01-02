import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'

interface StarRatingProps {
	rating: number // 1–5
	size?: string // optional: "sm", "md", "lg"
}

export default function StarRating({ rating, size = 'md' }: StarRatingProps) {
	const sizeMap: Record<string, string> = {
		sm: 'w-3 h-3',
		md: 'w-4 h-4',
		lg: 'w-6 h-6',
	}

	return (
		<div className="flex items-center gap-1">
			{Array.from({ length: 5 }).map((_, i) => {
				const isFilled = i < rating

				return (
					<FontAwesomeIcon
						key={i}
						icon={isFilled ? faStarSolid : faStarRegular}
						className={`${sizeMap[size]} ${
							isFilled ? 'text-yellow-500' : 'text-gray-300'
						}`}
					/>
				)
			})}
		</div>
	)
}
