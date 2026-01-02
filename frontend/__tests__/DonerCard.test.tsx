import DonerCard, {
	DonerCardSkeleton,
	type StoreSummary,
} from '@/components/DonerCard'
import { render, screen } from '@testing-library/react'

describe('DonerCard Component', () => {
	const mockStore: StoreSummary = {
		id: '1',
		name: 'Test Döner',
		district: 'Mitte',
		ai_score: 85,
		price: 7,
		ai_summary: 'Ein leckerer Döner mit viel Fleisch.',
	}

	it('renders store name', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Test Döner')).toBeInTheDocument()
	})

	it('renders store district', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Mitte')).toBeInTheDocument()
	})

	it('renders store rating', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Rating: 85')).toBeInTheDocument()
	})

	it('renders store price', () => {
		render(<DonerCard store={mockStore} />)

		expect(screen.getByText('Price: €7')).toBeInTheDocument()
	})

	it('renders store summary', () => {
		render(<DonerCard store={mockStore} />)

		expect(
			screen.getByText('Ein leckerer Döner mit viel Fleisch.'),
		).toBeInTheDocument()
	})

	it('renders dash when rating is missing', () => {
		const storeWithoutRating: StoreSummary = {
			...mockStore,
			ai_score: undefined,
		}

		render(<DonerCard store={storeWithoutRating} />)

		expect(screen.getByText('Rating: —')).toBeInTheDocument()
	})

	it('renders dash when price is missing', () => {
		const storeWithoutPrice: StoreSummary = {
			...mockStore,
			price: undefined,
		}

		render(<DonerCard store={storeWithoutPrice} />)

		expect(screen.getByText('Price: €—')).toBeInTheDocument()
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
