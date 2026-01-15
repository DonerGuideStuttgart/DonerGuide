'use client'
import { StoreBase } from '@/types/store'
import { useRef, useState } from 'react'
import Map, { MapRef, Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { StoreMarkerPopup } from './StoreMarkerPopup'

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
				<p className="text-neutral">
					Mapbox Token fehlt. Bitte NEXT_PUBLIC_MAPBOX_TOKEN setzen.
				</p>
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
						onClick={(e: {
							originalEvent: { stopPropagation: () => void }
						}) => {
							e.originalEvent.stopPropagation()
							setSelectedStore(store)
						}}
					>
						<div className="cursor-pointer transform transition-transform hover:scale-110">
							{/* Custom marker icon matching DaisyUI theme */}
							<svg
								width="32"
								height="40"
								viewBox="-2 -2 36 44"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								{/* Pin shape */}
								<path
									d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z"
									fill="#fb783a"
									stroke="#341c0a"
									strokeWidth="2"
								/>
								{/* Inner circle */}
								<circle cx="16" cy="16" r="6" fill="#341c0a" />
							</svg>
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
