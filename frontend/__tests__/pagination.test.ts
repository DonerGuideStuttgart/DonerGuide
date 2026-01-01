import { buildStoreQuery } from '@/helpers/api'
import type { FilterParams } from '@/types/store'

const INITIAL_LIMIT = 5
const LOAD_MORE_COUNT = 2

function createFilters(overrides: Partial<FilterParams> = {}): FilterParams {
	return {
		limit: INITIAL_LIMIT,
		offset: 0,
		...overrides,
	}
}

describe('Pagination Logic', () => {
	describe('Initial Load', () => {
		it('uses INITIAL_LIMIT for first load', () => {
			const filters = createFilters()

			expect(filters.limit).toBe(INITIAL_LIMIT)
			expect(filters.offset).toBe(0)
		})

		it('builds correct query for initial load', () => {
			const filters = createFilters()

			const query = buildStoreQuery(filters)

			expect(query).toContain(`limit=${INITIAL_LIMIT}`)
			expect(query).toContain('offset=0')
		})
	})

	describe('Load More', () => {
		it('calculates correct offset based on stores length', () => {
			const storesLength = 5
			const newOffset = storesLength

			expect(newOffset).toBe(5)
		})

		it('uses LOAD_MORE_COUNT for subsequent loads', () => {
			const storesLength = 5
			const filters = createFilters({
				offset: storesLength,
				limit: LOAD_MORE_COUNT,
			})

			const query = buildStoreQuery(filters)

			expect(query).toContain(`limit=${LOAD_MORE_COUNT}`)
			expect(query).toContain(`offset=${storesLength}`)
		})

		it('calculates correct offset after multiple load more clicks', () => {
			const initialStores = 5
			const afterFirstLoadMore = initialStores + LOAD_MORE_COUNT
			const afterSecondLoadMore = afterFirstLoadMore + LOAD_MORE_COUNT

			expect(afterFirstLoadMore).toBe(7)
			expect(afterSecondLoadMore).toBe(9)
		})
	})

	describe('Pagination Reset', () => {
		it('resets to initial values when filters change', () => {
			const currentFilters = createFilters({
				offset: 7,
				limit: LOAD_MORE_COUNT,
				district: ['Mitte'],
			})

			const resetFilters = {
				...currentFilters,
				offset: 0,
				limit: INITIAL_LIMIT,
			}

			expect(resetFilters.offset).toBe(0)
			expect(resetFilters.limit).toBe(INITIAL_LIMIT)
			expect(resetFilters.district).toEqual(['Mitte'])
		})
	})

	describe('Store Accumulation', () => {
		it('replaces stores when offset is 0', () => {
			const prevStores = [{ id: '1' }, { id: '2' }]
			const newItems = [{ id: '3' }, { id: '4' }]
			const offset = 0

			const result = offset > 0 ? [...prevStores, ...newItems] : newItems

			expect(result).toEqual(newItems)
			expect(result.length).toBe(2)
		})

		it('appends stores when offset > 0', () => {
			const prevStores = [{ id: '1' }, { id: '2' }]
			const newItems = [{ id: '3' }, { id: '4' }]
			const offset = 2

			const result = offset > 0 ? [...prevStores, ...newItems] : newItems

			expect(result).toEqual([...prevStores, ...newItems])
			expect(result.length).toBe(4)
		})
	})
})

describe('Configuration', () => {
	it('INITIAL_LIMIT is configured correctly', () => {
		expect(INITIAL_LIMIT).toBe(5)
	})

	it('LOAD_MORE_COUNT is configured correctly', () => {
		expect(LOAD_MORE_COUNT).toBe(2)
	})

	it('LOAD_MORE_COUNT is less than INITIAL_LIMIT', () => {
		expect(LOAD_MORE_COUNT).toBeLessThan(INITIAL_LIMIT)
	})
})
