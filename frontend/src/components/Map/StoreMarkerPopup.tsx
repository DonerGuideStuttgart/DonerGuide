'use client'
import Aistars from '@/assets/icons/aistars.svg'
import CircleSolid from '@/assets/icons/circlesolid.svg'
import Location from '@/assets/icons/location.svg'
import Badge from '@/components/badge/Badge'
import { getOpeningStatusText } from '@/helpers/openingHours'
import { routes } from '@/helpers/routes'
import { DISTRICT_LABELS } from '@/types/records'
import { StoreBase } from '@/types/store'
import { useRouter } from 'next/navigation'
import { Popup } from 'react-map-gl/mapbox'

interface StoreMarkerPopupProps {
	store: StoreBase
	onClose: () => void
}

export function StoreMarkerPopup({ store, onClose }: StoreMarkerPopupProps) {
	const router = useRouter()
	const openClosingText = getOpeningStatusText(store.openingHours)

	const handleClick = () => {
		router.push(routes.storeDetail(store.slug))
	}

	return (
		<Popup
			latitude={store.location.coordinates.lat}
			longitude={store.location.coordinates.lng}
			onClose={onClose}
			closeOnClick={false}
			anchor="bottom"
			offset={40}
			className="store-popup"
		>
			<div
				className=" rounded-lg shadow-lg cursor-pointer hover:bg-base-200 transition-colors"
				onClick={handleClick}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						handleClick()
					}
				}}
			>
				<div className="p-3 space-y-2 min-w-60 max-w-80">
					{/* Header with name and score */}
					<div className="flex items-center gap-2">
						<h3 className="text-base font-bold flex-1 truncate">
							{store.name}
						</h3>
						<Badge
							text={store.aiScore.toString()}
							icon={<Aistars className="size-3 fill-secondary" />}
							className="badge-secondary badge-sm"
						/>
						<div className="pl-4"></div>
					</div>

					{/* Opening hours and price */}
					<div className="flex items-center text-xs text-neutral">
						<div className="truncate">{openClosingText}</div>
						{store.price && (
							<>
								<CircleSolid className="size-1 fill-neutral mx-1.5 shrink-0" />
								<div className="shrink-0">{store.price}€</div>
							</>
						)}
					</div>

					{/* District */}
					{store.district && (
						<div className="flex items-center gap-1.5">
							<Location className="size-3 fill-neutral shrink-0" />
							<p className="text-neutral text-xs truncate">
								{DISTRICT_LABELS[store.district] || store.district}
							</p>
						</div>
					)}

					{/* Click to view hint */}
					<div className="text-xs text-primary font-medium pt-1 border-t border-base-300">
						Klicken für Details →
					</div>
				</div>
			</div>
		</Popup>
	)
}
