'use client'
import { StoreBase } from '@/types/store'
import { useRef, useState } from 'react'
import Map, { MapRef, Marker } from 'react-map-gl/mapbox'
import { StoreMarkerPopup } from './StoreMarkerPopup'
import Logo from '@/assets/logo/logo.svg'

interface StoreMapProps {
	stores: StoreBase[]
}

const STUTTGART_CENTER = {
	latitude: 48.7758,
	longitude: 9.1829,
	zoom: 12,
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export default function StoreMap({ stores }: StoreMapProps) {
	const mapRef = useRef<MapRef>(null)
	const [selectedStore, setSelectedStore] = useState<StoreBase | null>(null)

	if (!MAPBOX_TOKEN) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-base-200 rounded-xl border border-primary">
				<p className="text-neutral">Map kann nicht geladen werden.</p>
			</div>
		)
	}

	return (
		<div className="w-full h-[400px] lg:h-[600px] rounded-md overflow-hidden border border-primary relative">
			<Map
				ref={mapRef}
				mapboxAccessToken={MAPBOX_TOKEN}
				initialViewState={STUTTGART_CENTER}
				style={{ width: '100%', height: '100%' }}
				mapStyle="mapbox://styles/mapbox/light-v11"
				attributionControl={true}
			>
				{/* Render markers for each store */}
				{stores.map((store) => (
					<Marker
						key={store.slug}
						latitude={store.location.coordinates.lat}
						longitude={store.location.coordinates.lng}
						anchor="bottom"
						onClick={(e) => {
							e.originalEvent.stopPropagation()
							setSelectedStore(store)
						}}
					>
						<div className="cursor-pointer transform transition-transform hover:scale-110">
							<Logo height="40" width="32" />
							{/*<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 29.646 58.804"
								width="32"
								height="40"
							>
								<path
									d="M141.694-511.566a1.782,1.782,0,0,0-.46.357c-.219.242-.23.437-.265,3.98l-.035 3.716-5.545.034-5.545.035-.656.322a3.337 3.337 0 0 0-1.9 2.715c-.035.483.759 5.729 3.06 20.246 1.714 10.779 3.152 19.648 3.2 19.729a3.227 3.227 0 0 0 .3.391c.23.253.253.253 3.658.253h3.428l.035 3.163.035 3.164.322.311a1.07 1.07 0 0 0 1.541 0l.322-.311.035-3.164.034-3.163h3.428c3.405 0 3.428 0 3.658-.253a3.9 3.9 0 0 0 .311-.4c.1-.2 6.281-39.239 6.281-39.745a3.714 3.714 0 0 0-2.048-3c-.529-.253-.667-.253-6.085-.288l-5.545-.034-.034-3.727-.035-3.739-.288-.288A1.218 1.218 0 0 0 141.694-511.566Z"
									transform="translate(-127.291 511.626)"
									fill="#fb783a"
								/>
							</svg>*/}
						</div>
					</Marker>
				))}

				{/* Popup for selected store */}
				{selectedStore && (
					<StoreMarkerPopup
						store={selectedStore}
						onClose={() => setSelectedStore(null)}
					/>
				)}
			</Map>
		</div>
	)
}
