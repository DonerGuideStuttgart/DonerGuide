import type { FilterParams } from '@/types/store'
import { render, screen } from '@testing-library/react'

// Mock SVG imports
jest.mock('@/assets/icons/aistars.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="star-icon" />,
}))

jest.mock('@/assets/icons/close.svg', () => ({
	__esModule: true,
	default: () => <svg data-testid="close-icon" />,
}))

// Mock useExplore before importing FilterChips
const mockHandleRemoveFilter = jest.fn()
const mockHandleFiltersChange = jest.fn()
const mockHandleSortChange = jest.fn()
const mockHandleLoadMore = jest.fn()
const mockHandleResetAllFilters = jest.fn()

const mockUiFilters: FilterParams = {
	limit: 5,
	offset: 0,
}

jest.mock('@/app/(entdecken)/useExplore', () => ({
	useExplore: jest.fn(() => ({
		stores: [],
		error: null,
		loading: false,
		uiFilters: mockUiFilters,
		uiSort: '',
		hasMore: true,
		handleFiltersChange: mockHandleFiltersChange,
		handleSortChange: mockHandleSortChange,
		handleLoadMore: mockHandleLoadMore,
		handleRemoveFilter: mockHandleRemoveFilter,
		handleResetAllFilters: mockHandleResetAllFilters,
	})),
}))

// Import after mocking
import { useExplore } from '@/app/(entdecken)/useExplore'
import FilterChips from '@/components/FilterChips'

const INITIAL_LIMIT = 5

function createFilters(overrides: Partial<FilterParams> = {}): FilterParams {
	return {
		limit: INITIAL_LIMIT,
		offset: 0,
		...overrides,
	}
}

describe('ChipsFilterBar Component', () => {
	const mockUseExplore = useExplore as jest.MockedFunction<typeof useExplore>

	beforeEach(() => {
		mockHandleRemoveFilter.mockClear()
		mockUseExplore.mockReturnValue({
			stores: [],
			error: null,
			loading: false,
			uiFilters: createFilters(),
			uiSort: '',
			hasMore: true,
			handleFiltersChange: mockHandleFiltersChange,
			handleSortChange: mockHandleSortChange,
			handleLoadMore: mockHandleLoadMore,
			handleRemoveFilter: mockHandleRemoveFilter,
			handleResetAllFilters: mockHandleResetAllFilters,
		})
	})

	it('returns null when no filters are active', () => {
		const { container } = render(<FilterChips />)

		expect(container.firstChild).toBeNull()
	})

	it('renders chip for score filter', () => {
		const filters = createFilters({
			min_score: 20,
			max_score: 80,
		})

		mockUseExplore.mockReturnValue({
			stores: [],
			error: null,
			loading: false,
			uiFilters: filters,
			uiSort: '',
			hasMore: true,
			handleFiltersChange: mockHandleFiltersChange,
			handleSortChange: mockHandleSortChange,
			handleLoadMore: mockHandleLoadMore,
			handleRemoveFilter: mockHandleRemoveFilter,
			handleResetAllFilters: mockHandleResetAllFilters,
		})

		render(<FilterChips />)

		expect(screen.getByText('20', { exact: false })).toBeInTheDocument()
		expect(screen.getByText('80', { exact: false })).toBeInTheDocument()
	})

	it('renders chip for price filter', () => {
		const filters = createFilters({
			price_min: 5,
			price_max: 15,
		})

		mockUseExplore.mockReturnValue({
			stores: [],
			error: null,
			loading: false,
			uiFilters: filters,
			uiSort: '',
			hasMore: true,
			handleFiltersChange: mockHandleFiltersChange,
			handleSortChange: mockHandleSortChange,
			handleLoadMore: mockHandleLoadMore,
			handleRemoveFilter: mockHandleRemoveFilter,
			handleResetAllFilters: mockHandleResetAllFilters,
		})

		render(<FilterChips />)

		expect(screen.getByText('5€ - 15€')).toBeInTheDocument()
	})

	it('renders multiple chips for district filter', () => {
		const filters = createFilters({
			district: ['Mitte', 'West'],
		})

		mockUseExplore.mockReturnValue({
			stores: [],
			error: null,
			loading: false,
			uiFilters: filters,
			uiSort: '',
			hasMore: true,
			handleFiltersChange: mockHandleFiltersChange,
			handleSortChange: mockHandleSortChange,
			handleLoadMore: mockHandleLoadMore,
			handleRemoveFilter: mockHandleRemoveFilter,
			handleResetAllFilters: mockHandleResetAllFilters,
		})

		render(<FilterChips />)

		// The labels come from DISTRICT_LABELS
		expect(screen.getByText('Mitte')).toBeInTheDocument()
		expect(screen.getByText('West')).toBeInTheDocument()
	})

	it('renders remove button for each chip', () => {
		const filters = createFilters({
			halal: ['halal'],
		})

		mockUseExplore.mockReturnValue({
			stores: [],
			error: null,
			loading: false,
			uiFilters: filters,
			uiSort: '',
			hasMore: true,
			handleFiltersChange: mockHandleFiltersChange,
			handleSortChange: mockHandleSortChange,
			handleLoadMore: mockHandleLoadMore,
			handleRemoveFilter: mockHandleRemoveFilter,
			handleResetAllFilters: mockHandleResetAllFilters,
		})

		render(<FilterChips />)

		const removeButtons = screen.getAllByRole('button', {
			name: /remove filter/i,
		})
		expect(removeButtons.length).toBeGreaterThan(0)
	})
})
