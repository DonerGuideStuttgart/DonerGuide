import type { FilterParams } from '@/types/store'
import {
	filtersToUrlParams,
	urlParamsToFilters,
	removeFilterValue,
	resetPagination,
	updatePaginationForLoadMore,
} from '@/app/(entdecken)/exploreUtils'

const INITIAL_LIMIT = 5
const LOAD_MORE_COUNT = 2

function createFilters(overrides: Partial<FilterParams> = {}): FilterParams {
	return {
		limit: INITIAL_LIMIT,
		offset: 0,
		...overrides,
	}
}

describe('filtersToUrlParams', () => {
	it('converts undefined to null', () => {
		const filters = createFilters({
			min_score: undefined,
			district: undefined,
		})

		const result = filtersToUrlParams(filters, '')

		expect(result.min_score).toBeNull()
		expect(result.district).toBeNull()
	})

	it('keeps defined values', () => {
		const filters = createFilters({
			min_score: 50,
			district: ['Mitte', 'West'],
		})

		const result = filtersToUrlParams(filters, 'score_desc')

		expect(result.min_score).toBe(50)
		expect(result.district).toEqual(['Mitte', 'West'])
		expect(result.sort).toBe('score_desc')
	})

	it('converts empty arrays to null', () => {
		const filters = createFilters({
			district: [],
			open_hours: [],
		})

		const result = filtersToUrlParams(filters, '')

		expect(result.district).toBeNull()
		expect(result.open_hours).toBeNull()
	})
})

describe('urlParamsToFilters', () => {
	it('converts null to undefined', () => {
		const urlParams = {
			limit: 5,
			offset: 0,
			min_score: null,
			max_score: null,
			price_min: null,
			price_max: null,
			district: null,
			open_hours: null,
			vegetarian: null,
			halal: null,
			sauce_amount_min: null,
			sauce_amount_max: null,
			meat_ratio_min: null,
			meat_ratio_max: null,
			waiting_time: null,
			payment_methods: null,
		}

		const result = urlParamsToFilters(urlParams)

		expect(result.min_score).toBeUndefined()
		expect(result.district).toBeUndefined()
	})

	it('keeps defined values', () => {
		const urlParams = {
			limit: 5,
			offset: 10,
			min_score: 50,
			max_score: null,
			price_min: null,
			price_max: null,
			district: ['Mitte'],
			open_hours: null,
			vegetarian: null,
			halal: null,
			sauce_amount_min: null,
			sauce_amount_max: null,
			meat_ratio_min: null,
			meat_ratio_max: null,
			waiting_time: null,
			payment_methods: null,
		}

		const result = urlParamsToFilters(urlParams)

		expect(result.limit).toBe(5)
		expect(result.offset).toBe(10)
		expect(result.min_score).toBe(50)
		expect(result.district).toEqual(['Mitte'])
	})
})

describe('removeFilterValue', () => {
	it('removes single key', () => {
		const filters = createFilters({ min_score: 50 })

		const result = removeFilterValue(filters, 'min_score')

		expect(result.min_score).toBeUndefined()
	})

	it('removes multiple keys at once', () => {
		const filters = createFilters({
			min_score: 50,
			max_score: 100,
		})

		const result = removeFilterValue(filters, ['min_score', 'max_score'])

		expect(result.min_score).toBeUndefined()
		expect(result.max_score).toBeUndefined()
	})

	it('removes single value from array field', () => {
		const filters = createFilters({
			district: ['Mitte', 'West', 'Ost'],
		})

		const result = removeFilterValue(filters, 'district', 'West')

		expect(result.district).toEqual(['Mitte', 'Ost'])
	})

	it('sets array to undefined when last value removed', () => {
		const filters = createFilters({
			district: ['Mitte'],
		})

		const result = removeFilterValue(filters, 'district', 'Mitte')

		expect(result.district).toBeUndefined()
	})
})

describe('resetPagination', () => {
	it('resets offset to 0 and limit to initial', () => {
		const filters = createFilters({
			offset: 10,
			limit: LOAD_MORE_COUNT,
			district: ['Mitte'],
		})

		const result = resetPagination(filters, INITIAL_LIMIT)

		expect(result.offset).toBe(0)
		expect(result.limit).toBe(INITIAL_LIMIT)
		expect(result.district).toEqual(['Mitte'])
	})
})

describe('updatePaginationForLoadMore', () => {
	it('sets offset to current length and limit to load more count', () => {
		const filters = createFilters()
		const currentLength = 5

		const result = updatePaginationForLoadMore(
			filters,
			currentLength,
			LOAD_MORE_COUNT,
		)

		expect(result.offset).toBe(5)
		expect(result.limit).toBe(LOAD_MORE_COUNT)
	})
})
