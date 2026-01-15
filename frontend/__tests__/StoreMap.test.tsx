import StoreMap from '@/components/Map/StoreMap'
import type { StoreBase } from '@/types/store'
import { render, screen } from '@testing-library/react'

// Mock StoreMarkerPopup
jest.mock('@/components/Map/StoreMarkerPopup', () => ({
	StoreMarkerPopup: ({
		store,
		onClose,
	}: {
		store: StoreBase
		onClose: () => void
	}) => (
		<div data-testid="marker-popup" data-store-slug={store.slug}>
			<button onClick={onClose}>Close</button>
		</div>
	),
}))

describe('StoreMap Component', () => {
	const mockStores: StoreBase[] = [
		{
			slug: 'test-doener-1',
			imageUrls: [],
			name: 'Test Döner 1',
			district: 'Mitte',
			location: {
				coordinates: { lat: 48.775845, lng: 9.182932 },
				address: {
					postalCode: '70173',
					locality: 'Stuttgart',
					sublocality: 'Mitte',
					streetAddress: 'Teststraße 1',
				},
			},
			aiScore: 85,
			price: 7,
			openingHours: {
				hours: {
					mon: [{ start: 600, end: 1320 }],
				},
				timezone: 'Europe/Berlin',
			},
		},
		{
			slug: 'test-doener-2',
			imageUrls: [],
			name: 'Test Döner 2',
			district: 'West',
			location: {
				coordinates: { lat: 48.765845, lng: 9.172932 },
				address: {
					postalCode: '70174',
					locality: 'Stuttgart',
					sublocality: 'West',
					streetAddress: 'Teststraße 2',
				},
			},
			aiScore: 90,
			price: 8,
			openingHours: {
				hours: {
					mon: [{ start: 600, end: 1320 }],
				},
				timezone: 'Europe/Berlin',
			},
		},
	]

	beforeEach(() => {
		// Set mock Mapbox token
		process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token'
	})

	afterEach(() => {
		delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
	})

	describe('Error Handling', () => {
		it('should handle missing Mapbox token gracefully', () => {
			// Note: NEXT_PUBLIC_ env vars are bundled at build time,
			// so we test the component structure rather than runtime behavior
			const originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
			delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN

			const { container } = render(<StoreMap stores={mockStores} />)

			// Component should still render a container
			const mapContainer = container.querySelector('.border-primary')
			expect(mapContainer).toBeInTheDocument()

			// Restore
			if (originalToken) {
				process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken
			}
		})
	})

	describe('Component Structure', () => {
		it('should render with correct container styling', () => {
			const { container } = render(<StoreMap stores={mockStores} />)
			const mapContainer = container.querySelector('.border-primary')
			expect(mapContainer).toBeInTheDocument()
			expect(mapContainer).toHaveClass('rounded-md', 'overflow-hidden')
		})

		it('should have responsive height classes', () => {
			const { container } = render(<StoreMap stores={mockStores} />)
			const mapContainer = container.querySelector('[class*="h-[400px]"]')
			expect(mapContainer).toBeInTheDocument()
		})

		it('should accept stores prop', () => {
			const { rerender } = render(<StoreMap stores={mockStores} />)

			// Should not throw when re-rendering with different stores
			expect(() => {
				rerender(<StoreMap stores={[]} />)
			}).not.toThrow()

			expect(() => {
				rerender(<StoreMap stores={mockStores} />)
			}).not.toThrow()
		})
	})
})
