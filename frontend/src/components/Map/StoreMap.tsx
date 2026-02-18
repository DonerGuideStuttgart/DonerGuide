'use client'
import { StoreBase } from '@/types/store'
import { useRef, useState } from 'react'
import Map, { MapRef, Marker } from 'react-map-gl/mapbox'
import { StoreMarkerPopup } from './StoreMarkerPopup'
import MapPin from '@/assets/logo/map_pin.svg'

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
							<MapPin height="40" width="20" />
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
