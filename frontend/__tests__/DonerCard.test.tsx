import DonerCard, { DonerCardSkeleton } from '@/components/DonerCard'
import type { StoreBase } from '@/types/store'
import { render, screen } from '@testing-library/react'

// Mock all SVG imports
jest.mock('@/assets/icons/aistars.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="aistars-icon" />,
}))
jest.mock('@/assets/icons/infocircle.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="infocircle-icon" />,
}))
jest.mock('@/assets/icons/circlesolid.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="circlesolid-icon" />,
}))
jest.mock('@/assets/icons/clock.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="clock-icon" />,
}))
jest.mock('@/assets/icons/vegetarian.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="vegetarian-icon" />,
}))
jest.mock('@/assets/icons/vegan.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="vegan-icon" />,
}))
jest.mock('@/assets/icons/run.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="run-icon" />,
}))
jest.mock('@/assets/icons/xcircle.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="xcircle-icon" />,
}))
jest.mock('@/assets/icons/creditcard.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="creditcard-icon" />,
}))
jest.mock('@/assets/icons/cash.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="cash-icon" />,
}))

// Mock Next.js Link and Image
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode
		href: string
	}) => <a href={href}>{children}</a>,
}))
jest.mock('next/image', () => ({
	__esModule: true,
	default: ({
		src,
		alt,
		...props
	}: {
		src: string
		alt: string
		[key: string]: unknown
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} {...props} />,
}))

describe('DonerCard Component', () => {
	const mockStore: StoreBase = {
		slug: 'test-doener',
		imageUrls: [],
		name: 'Test Döner',
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
				mon: [{ start: '10:00', end: '22:00' }],
				tue: [{ start: '10:00', end: '22:00' }],
				wed: [{ start: '10:00', end: '22:00' }],
				thu: [{ start: '10:00', end: '22:00' }],
				fri: [{ start: '10:00', end: '22:00' }],
				sat: [{ start: '11:00', end: '23:00' }],
				sun: [{ start: '11:00', end: '22:00' }],
			},
			timezone: 'Europe/Berlin',
		},
	}

	it('renders store name', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Test Döner')).toBeInTheDocument()
	})

	it('renders store district', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Mitte')).toBeInTheDocument()
	})

	it('renders store AI score', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('85')).toBeInTheDocument()
	})

	it('renders store price', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText(/7€/)).toBeInTheDocument()
	})

	it('renders opening hours status', () => {
		render(<DonerCard store={mockStore} />)

		// Should show opening hours text - use getAllByText since badge also contains opening status
		const openingTexts = screen.getAllByText(/Schließt|Öffnet|geschlossen/i)
		expect(openingTexts.length).toBeGreaterThan(0)
	})

	it('renders dash when price is missing', () => {
		const storeWithoutPrice: StoreBase = {
			...mockStore,
			price: undefined,
		}

		render(<DonerCard store={storeWithoutPrice} />)

		// When price is missing, the price section should not be rendered
		expect(screen.queryByText(/Döner Preis/)).not.toBeInTheDocument()
	})
})

describe('DonerCardSkeleton Component', () => {
	it('renders skeleton with animation', () => {
		render(<DonerCardSkeleton />)

		const article = screen.getByRole('article')
		expect(article).toHaveClass('animate-pulse')
	})

	it('renders skeleton placeholder elements', () => {
		const { container } = render(<DonerCardSkeleton />)

		const placeholders = container.querySelectorAll('.bg-neutral-content\\/30')
		expect(placeholders.length).toBeGreaterThan(0)
	})
})
