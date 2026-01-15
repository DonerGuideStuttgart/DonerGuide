import React from 'react'

export default function Map({
	children,
	...props
}: {
	children?: React.ReactNode
	[key: string]: unknown
}) {
	return (
		<div data-testid="map" {...props}>
			{children}
		</div>
	)
}

export function Marker({
	children,
	latitude,
	longitude,
}: {
	children?: React.ReactNode
	latitude: number
	longitude: number
}) {
	return (
		<div
			data-testid="marker"
			data-latitude={latitude}
			data-longitude={longitude}
		>
			{children}
		</div>
	)
}

export function Popup({
	children,
	onClose,
	latitude,
	longitude,
}: {
	children: React.ReactNode
	onClose: () => void
	latitude: number
	longitude: number
}) {
	return (
		<div
			data-testid="popup"
			data-latitude={latitude}
			data-longitude={longitude}
		>
			<button data-testid="popup-close" onClick={onClose}>
				×
			</button>
			{children}
		</div>
	)
}

export interface MapRef {
	getMap: () => unknown
}
