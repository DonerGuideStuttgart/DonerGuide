import { render, screen } from '@testing-library/react'
import ChipsFilterBar from '@/components/ChipsFilterBar'
import type { FilterParams } from '@/types/store'

const INITIAL_LIMIT = 5

function createFilters(overrides: Partial<FilterParams> = {}): FilterParams {
	return {
		limit: INITIAL_LIMIT,
		offset: 0,
		...overrides,
	}
}

describe('ChipsFilterBar Component', () => {
	const mockOnRemove = jest.fn()

	beforeEach(() => {
		mockOnRemove.mockClear()
	})

	it('returns null when no filters are active', () => {
		const filters = createFilters()

		const { container } = render(
			<ChipsFilterBar filters={filters} onRemove={mockOnRemove} />,
		)

		expect(container.firstChild).toBeNull()
	})

	it('renders chip for score filter', () => {
		const filters = createFilters({
			min_score: 20,
			max_score: 80,
		})

		render(<ChipsFilterBar filters={filters} onRemove={mockOnRemove} />)

		expect(screen.getByText('20-80⭐')).toBeInTheDocument()
	})

	it('renders chip for price filter', () => {
		const filters = createFilters({
			price_min: 5,
			price_max: 15,
		})

		render(<ChipsFilterBar filters={filters} onRemove={mockOnRemove} />)

		expect(screen.getByText('5-15€')).toBeInTheDocument()
	})

	it('renders multiple chips for district filter', () => {
		const filters = createFilters({
			district: ['Mitte', 'West'],
		})

		render(<ChipsFilterBar filters={filters} onRemove={mockOnRemove} />)

		// The labels come from DISTRICT_LABELS
		expect(screen.getByText('Mitte')).toBeInTheDocument()
		expect(screen.getByText('West')).toBeInTheDocument()
	})

	it('renders remove button for each chip', () => {
		const filters = createFilters({
			halal: 'halal',
		})

		render(<ChipsFilterBar filters={filters} onRemove={mockOnRemove} />)

		const removeButtons = screen.getAllByRole('button', {
			name: /remove filter/i,
		})
		expect(removeButtons.length).toBeGreaterThan(0)
	})
})
