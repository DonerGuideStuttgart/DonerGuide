import { buildStoreQuery } from '@/helpers/api'
import type { FilterParams } from '@/types/store'

const INITIAL_LIMIT = 5

function createFilters(overrides: Partial<FilterParams> = {}): FilterParams {
	return {
		limit: INITIAL_LIMIT,
		offset: 0,
		...overrides,
	}
}

describe('buildStoreQuery', () => {
	it('returns query with limit and offset when only required fields are present', () => {
		const filters = createFilters()
		expect(buildStoreQuery(filters)).toBe('limit=5&offset=0')
	})

	it('includes scalar values (numbers/strings) as strings', () => {
		const filters = createFilters({
			min_score: 5,
			price_max: 12,
			halal: ['halal'],
		})

		const queryString = buildStoreQuery(filters)

		expect(queryString).toContain('min_score=5')
		expect(queryString).toContain('price_max=12')
		expect(queryString).toContain('halal=halal')
	})

	it('skips filters that are undefined', () => {
		const filters = createFilters({
			min_score: undefined,
			waiting_time: undefined,
			payment_methods: undefined,
		})

		const queryString = buildStoreQuery(filters)

		expect(queryString).not.toContain('min_score=')
		expect(queryString).not.toContain('waiting_time=')
		expect(queryString).not.toContain('payment_methods=')
	})

	it('serializes array filters by joining with commas', () => {
		const filters = createFilters({
			district: ['West', 'Ost'],
			open_hours: ['MORNING'],
		})

		const queryString = buildStoreQuery(filters)

		expect(queryString).toContain('district=West%2COst')
		expect(queryString).toContain('open_hours=MORNING')
	})

	it('skips empty array filters', () => {
		const filters = createFilters({
			district: [],
			open_hours: [],
		})

		const queryString = buildStoreQuery(filters)

		expect(queryString).not.toContain('district=')
		expect(queryString).not.toContain('open_hours=')
	})

	it('adds sort when sort is provided', () => {
		const filters = createFilters()

		const queryString = buildStoreQuery(filters, 'price_asc')

		expect(queryString).toContain('sort=price_asc')
	})

	it('does not add sort when sort is an empty string', () => {
		const filters = createFilters()

		const queryString = buildStoreQuery(filters, '')

		expect(queryString).not.toContain('sort=')
	})

	it('produces a query string that can be parsed back correctly', () => {
		const filters = createFilters({
			offset: 30,
			district: ['West', 'Ost'],
			min_score: 10,
			halal: ['not_halal'],
		})

		const queryString = buildStoreQuery(filters, 'score_desc')
		const parsed = new URLSearchParams(queryString)

		expect(parsed.get('limit')).toBe('5')
		expect(parsed.get('offset')).toBe('30')
		expect(parsed.get('district')).toBe('West,Ost')
		expect(parsed.get('min_score')).toBe('10')
		expect(parsed.get('halal')).toBe('not_halal')
		expect(parsed.get('sort')).toBe('score_desc')
	})
})
